#!/usr/bin/env python3
"""Issues abertas por workflow: uma por problema, sucesso só no resumo.

Subcomandos
  self-test
      Testa a classificação sem rede.
  write-cora-report --out PATH
      Gera o relatório da auditoria Cora a partir das variáveis de ambiente
      e acrescenta o mesmo texto ao resumo do workflow (GITHUB_STEP_SUMMARY).
  write-deploy-report --out PATH
      Gera o relatório do probe de deploy.
  upsert --title T --tracker-label L --body-file F
      Comenta na issue aberta com esse título e essa label, ou cria uma
      (labels L + bot) se não existir. Duplicatas do mesmo título são fechadas.
  resolve --title T --tracker-label L --body-file F
      Comenta e fecha as issues abertas com esse título e essa label.
      Não cria issue.
  cleanup [--apply]
      Fecha issues antigas de sucesso e duplicatas dos workflows
      cora-audit e probe-vercel. Dry-run por padrão.

Variáveis: GH_TOKEN (usado pelo gh), GH_REPO ou GITHUB_REPOSITORY.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from typing import Iterable

BOT_LOGINS = {
    "app/github-actions",
    "github-actions[bot]",
    "github-actions",
}

TRACKER_LABELS = ("cora-audit", "deploy-status")

LABEL_META = {
    "bot": ("6e7781", "Aberta por workflow automático"),
    "cora-audit": ("7057ff", "Resultado da auditoria Cora vs banco"),
    "deploy-status": ("0075ca", "Resultado automático de deploy Vercel com falha"),
}


@dataclass
class Decision:
    number: int
    title: str
    tracker: str
    action: str  # close | keep
    reason: str  # success | superseded | duplicate | keep
    close_reason: str | None = None
    duplicate_of: int | None = None


def label_names(issue: dict) -> set[str]:
    names: set[str] = set()
    for label in issue.get("labels") or []:
        if isinstance(label, str):
            names.add(label)
        elif isinstance(label, dict) and label.get("name"):
            names.add(label["name"])
    return names


def author_login(issue: dict) -> str:
    author = issue.get("author") or {}
    if isinstance(author, str):
        return author
    return author.get("login") or ""


def is_bot_author(issue: dict) -> bool:
    login = author_login(issue)
    if login in BOT_LOGINS:
        return True
    author = issue.get("author") or {}
    if isinstance(author, dict) and author.get("is_bot") and "github-actions" in login:
        return True
    return False


def title_matches_tracker(tracker: str, title: str) -> bool:
    if tracker == "cora-audit":
        # Títulos antigos vinham com emoji na frente ("🔍 Auditoria Cora — …").
        return "Auditoria Cora" in title
    if tracker == "deploy-status":
        return "Deploy OK" in title or "Deploy com problemas" in title
    return False


def cora_result_is_success(body: str) -> bool:
    """Verdadeiro só quando a linha de resultado diz que o banco está em dia."""
    for line in (body or "").splitlines():
        if "Resultado" not in line:
            continue
        if "SINCRONIZADO" in line and "GAP" not in line:
            return True
        return False
    return False


def is_success_issue(tracker: str, title: str, body: str) -> bool:
    if tracker == "deploy-status":
        return "Deploy OK" in title and "problemas" not in title.lower()
    if tracker == "cora-audit":
        return cora_result_is_success(body)
    return False


def tracker_of(issue: dict) -> str | None:
    if not is_bot_author(issue):
        return None
    labels = label_names(issue)
    title = issue.get("title") or ""
    for tracker in TRACKER_LABELS:
        if tracker in labels and title_matches_tracker(tracker, title):
            return tracker
    return None


def plan_cleanup(issues: Iterable[dict]) -> list[Decision]:
    """Decide o que fechar.

    Por tracker (label), a issue de número mais alto é a execução mais recente.
    Se ela for um relatório de sucesso, fecha todas — as falhas anteriores
    foram superadas. Se for uma falha, mantém só essa e fecha o restante
    (sucessos antigos e duplicatas).
    """
    grouped: dict[str, list[dict]] = {name: [] for name in TRACKER_LABELS}
    seen: set[int] = set()
    for issue in issues:
        number = int(issue["number"])
        if number in seen:
            continue
        tracker = tracker_of(issue)
        if tracker is None:
            continue
        seen.add(number)
        grouped[tracker].append(issue)

    decisions: list[Decision] = []
    for tracker, group in grouped.items():
        group.sort(key=lambda item: int(item["number"]), reverse=True)
        if not group:
            continue
        newest = group[0]
        newest_success = is_success_issue(
            tracker, newest.get("title") or "", newest.get("body") or ""
        )
        keep_number = None if newest_success else int(newest["number"])
        for issue in group:
            number = int(issue["number"])
            title = issue.get("title") or ""
            success = is_success_issue(tracker, title, issue.get("body") or "")
            if keep_number is not None and number == keep_number:
                decisions.append(
                    Decision(
                        number=number,
                        title=title,
                        tracker=tracker,
                        action="keep",
                        reason="keep",
                    )
                )
                continue
            if success:
                decisions.append(
                    Decision(
                        number=number,
                        title=title,
                        tracker=tracker,
                        action="close",
                        reason="success",
                        close_reason="completed",
                    )
                )
            elif newest_success:
                decisions.append(
                    Decision(
                        number=number,
                        title=title,
                        tracker=tracker,
                        action="close",
                        reason="superseded",
                        close_reason="completed",
                    )
                )
            else:
                decisions.append(
                    Decision(
                        number=number,
                        title=title,
                        tracker=tracker,
                        action="close",
                        reason="duplicate",
                        close_reason="duplicate",
                        duplicate_of=keep_number,
                    )
                )
    return decisions


def cora_is_healthy(audit_http: str, missing: str) -> bool:
    return audit_http == "200" and missing == "0"


def deploy_is_healthy(all_green: str) -> bool:
    return all_green == "true"


def build_cora_report(env: dict[str, str]) -> str:
    hora = env.get("HORA") or ""
    today = env.get("TODAY") or ""
    audit_http = env.get("AUDIT_HTTP") or ""
    missing = env.get("MISSING") or ""
    cora_total = env.get("CORA_TOTAL") or "?"
    db_total = env.get("DB_TOTAL") or "?"
    sync_http = env.get("SYNC_HTTP") or ""
    synced = env.get("SYNCED") or ""
    run_url = env.get("RUN_URL") or ""

    if cora_is_healthy(audit_http, missing):
        result = "SINCRONIZADO — banco em dia com a Cora"
    elif audit_http == "200":
        result = f"GAP DETECTADO — {missing} lançamentos na Cora faltam no banco"
        if sync_http == "200":
            result += f" | AUTO-SYNC: {synced} importados"
    else:
        result = f"AUDIT-PROBE HTTP {audit_http or 'sem resposta'}"

    return "\n".join(
        [
            f"## Auditoria Cora vs Banco — {hora}",
            "",
            "### Infraestrutura (/api/health)",
            "| Check | Valor |",
            "|---|---|",
            f"| HTTP | {env.get('HEALTH_HTTP') or '?'} |",
            f"| erpPing | {env.get('ERP_PING') or '?'} |",
            f"| erpTransactionCount | {env.get('ERP_TXN') or '?'} |",
            f"| coraHolding | {env.get('CORA') or '?'} |",
            f"| coraJacqes | {env.get('JACQES') or '?'} |",
            f"| syncReady | {env.get('SYNC_READY') or '?'} |",
            f"| dbAdapter | {env.get('ADAPTER') or '?'} |",
            "",
            f"### Auditoria Cora (2026-01-01 a {today})",
            "| Conta | Cora | Banco | Gap |",
            "|---|---|---|---|",
            f"| AWQ_Holding | {cora_total} | {db_total} | {missing or '?'} |",
            "",
            f"**Resultado: {result}**",
            "",
            f"Execução: {run_url}" if run_url else "",
            "",
            "*workflow cora-audit.yml*",
            "",
        ]
    )


def build_deploy_report(env: dict[str, str]) -> str:
    all_green = env.get("ALL_GREEN") or ""
    healthy = deploy_is_healthy(all_green)
    result = (
        "saudável — allGreen true"
        if healthy
        else f"falha — allGreen {all_green or 'ausente'}"
    )
    run_url = env.get("RUN_URL") or ""
    lines = [
        f"## Probe de deploy — {env.get('HORA') or ''}",
        "",
        f"**Commit**: `{env.get('COMMIT_SHA') or ''}`",
        f"**Branch**: `{env.get('BRANCH') or ''}`",
        f"**Resultado: {result}**",
        "",
        "| Check | Resultado |",
        "|---|---|",
        f"| servedSha == pushedSha | {env.get('SHA_MATCH') or '?'} ({env.get('SERVED_SHA') or '?'}) |",
        f"| deploymentId | {env.get('DEPLOY_ID') or '?'} |",
        f"| allGreen | {all_green or '?'} |",
        f"| coraReady | {env.get('CORA') or '?'} |",
        f"| syncReady | {env.get('SYNC') or '?'} |",
        f"| erpPing | {env.get('ERP') or '?'} |",
        f"| /login HTTP | {env.get('APP') or '?'} |",
        f"| /api/auth/csrf HTTP | {env.get('AUTH') or '?'} |",
        "",
    ]
    if run_url:
        lines.append(f"Log da execução: {run_url}")
        lines.append("")
    lines.append("*workflow probe-vercel.yml*")
    lines.append("")
    return "\n".join(lines)


def append_summary(text: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        if not text.endswith("\n"):
            text += "\n"
        handle.write(text)


def detect_repo(explicit: str | None) -> str:
    if explicit:
        return explicit
    for key in ("GH_REPO", "GITHUB_REPOSITORY"):
        value = os.environ.get(key)
        if value:
            return value
    proc = subprocess.run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        raise SystemExit(proc.stderr.strip() or "Não foi possível detectar o repositório.")
    return proc.stdout.strip()


def run_gh(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(["gh", *args], text=True, capture_output=True, check=False)
    if check and proc.returncode != 0:
        message = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit(f"gh {' '.join(args[:3])} falhou: {message}")
    return proc


def ensure_label(repo: str, name: str) -> None:
    color, description = LABEL_META[name]
    proc = run_gh(
        [
            "label",
            "create",
            name,
            "--repo",
            repo,
            "--color",
            color,
            "--description",
            description,
        ],
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or "").lower()
        if "already exists" in err or "already_exists" in err:
            return
        # A label já existente também volta como erro de validação em algumas versões.
        if "name already exists" in err:
            return
        print(proc.stderr.strip() or f"aviso: label {name} não foi criada", file=sys.stderr)


def list_open_by_label(repo: str, label: str) -> list[dict]:
    issues: list[dict] = []
    page = 1
    while page <= 30:
        proc = run_gh(
            [
                "api",
                f"/repos/{repo}/issues?state=open&labels={label}&per_page=100&page={page}",
            ]
        )
        payload = json.loads(proc.stdout or "[]")
        if not isinstance(payload, list):
            raise SystemExit(f"Resposta inesperada ao listar issues: {payload}")
        for item in payload:
            if "pull_request" in item:
                continue
            user = item.get("user") or {}
            issues.append(
                {
                    "number": item["number"],
                    "title": item.get("title") or "",
                    "body": item.get("body") or "",
                    "createdAt": item.get("created_at") or "",
                    "author": {
                        "login": user.get("login") or "",
                        "is_bot": user.get("type") == "Bot",
                    },
                    "labels": [label_item.get("name") for label_item in item.get("labels") or []],
                }
            )
        if len(payload) < 100:
            break
        page += 1
    return issues


def find_open_exact(repo: str, tracker_label: str, title: str) -> list[dict]:
    """Lista issues abertas com a label e filtra pelo título exato.

    A busca do GitHub ignora acentos e pontuação; o filtro local é o que deduplica.
    """
    proc = run_gh(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--label",
            tracker_label,
            "--limit",
            "1000",
            "--json",
            "number,title",
        ]
    )
    found = [item for item in json.loads(proc.stdout or "[]") if item.get("title") == title]
    found.sort(key=lambda item: int(item["number"]))
    return found


def comment_and_close(
    repo: str,
    number: int,
    close_reason: str,
    comment: str,
    duplicate_of: int | None = None,
) -> None:
    cmd = [
        "issue",
        "close",
        str(number),
        "--repo",
        repo,
        "--reason",
        close_reason,
        "--comment",
        comment,
    ]
    if duplicate_of is not None:
        cmd.extend(["--duplicate-of", str(duplicate_of)])
    delay = 1.0
    last_err = ""
    for attempt in range(5):
        proc = run_gh(cmd, check=False)
        if proc.returncode == 0:
            return
        last_err = (proc.stderr or proc.stdout or "").strip()
        if attempt == 4:
            break
        time.sleep(delay)
        delay = min(delay * 2, 30)
    raise SystemExit(f"Não fechei #{number}: {last_err}")


def close_comment(decision: Decision) -> str:
    if decision.reason == "success":
        return (
            "Fechada pela limpeza de issues automáticas: este registro é um relatório "
            "de sucesso. Os workflows passam a publicar sucesso só no resumo da execução."
        )
    if decision.reason == "superseded":
        return (
            "Fechada pela limpeza de issues automáticas: uma execução posterior do mesmo "
            "verificador ficou saudável. O problema deixou de estar em aberto."
        )
    return (
        "Fechada pela limpeza de issues automáticas: duplicata de um problema já "
        f"registrado na issue #{decision.duplicate_of}. Os workflows passam a reutilizar "
        "uma única issue por tipo de falha."
    )


def summarize_plan(decisions: list[Decision]) -> str:
    lines = ["## Limpeza de issues de bot", ""]
    if not decisions:
        lines.append("Nenhuma issue de bot elegível.")
        return "\n".join(lines) + "\n"
    lines.append("| Tracker | Ação | Motivo | Quantidade |")
    lines.append("|---|---|---|---|")
    buckets: dict[tuple[str, str, str], int] = {}
    for decision in decisions:
        key = (decision.tracker, decision.action, decision.reason)
        buckets[key] = buckets.get(key, 0) + 1
    for (tracker, action, reason), count in sorted(buckets.items()):
        lines.append(f"| {tracker} | {action} | {reason} | {count} |")
    closing = [item for item in decisions if item.action == "close"]
    keeping = [item for item in decisions if item.action == "keep"]
    lines.append("")
    lines.append(f"**Fecharia: {len(closing)}**")
    lines.append(f"**Manteria: {len(keeping)}**")
    if keeping:
        lines.append("")
        lines.append("Mantidas:")
        for item in keeping:
            lines.append(f"- #{item.number} ({item.tracker}) {item.title}")
    return "\n".join(lines) + "\n"


def cmd_cleanup(repo: str, apply: bool) -> int:
    collected: list[dict] = []
    for label in TRACKER_LABELS:
        print(f"Listando issues abertas com label {label}...", flush=True)
        batch = list_open_by_label(repo, label)
        print(f"  {len(batch)} issues", flush=True)
        collected.extend(batch)
    unique = {int(issue["number"]): issue for issue in collected}
    skipped = [issue for issue in unique.values() if tracker_of(issue) is None]
    if skipped:
        print(f"Ignoradas (autor ou título fora do padrão de bot): {len(skipped)}")
        for issue in sorted(skipped, key=lambda item: int(item["number"])):
            print(f"  #{issue['number']} {issue.get('title')}")
    decisions = plan_cleanup(unique.values())
    for tracker in TRACKER_LABELS:
        group = [item for item in decisions if item.tracker == tracker]
        if not group:
            continue
        newest = max(group, key=lambda item: item.number)
        print(
            f"Mais recente {tracker}: #{newest.number} ação={newest.action} "
            f"motivo={newest.reason} título={newest.title}"
        )
    report = summarize_plan(decisions)
    print(report)
    append_summary(report)
    mode = "apply" if apply else "dry-run"
    print(f"Modo: {mode}")
    append_summary(f"Modo: **{mode}**\n")
    if not apply:
        print("Dry-run: nenhuma issue foi fechada. Rode com --apply para fechar.")
        return 0
    closed = 0
    for decision in decisions:
        if decision.action != "close":
            if decision.action == "keep":
                run_gh(
                    [
                        "issue",
                        "edit",
                        str(decision.number),
                        "--repo",
                        repo,
                        "--add-label",
                        "bot",
                    ],
                    check=False,
                )
            continue
        comment_and_close(
            repo,
            decision.number,
            decision.close_reason or "completed",
            close_comment(decision),
            decision.duplicate_of,
        )
        closed += 1
        time.sleep(0.2)
        if closed % 25 == 0:
            print(f"Fechadas {closed}...", flush=True)
    print(f"Fechadas: {closed}")
    append_summary(f"Fechadas: **{closed}**\n")
    return 0


def read_body(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def cmd_upsert(repo: str, title: str, tracker_label: str, body_file: str) -> int:
    if tracker_label not in LABEL_META:
        raise SystemExit(f"Label de tracker desconhecida: {tracker_label}")
    ensure_label(repo, "bot")
    ensure_label(repo, tracker_label)
    existing = find_open_exact(repo, tracker_label, title)
    body = read_body(body_file)
    if not existing:
        proc = run_gh(
            [
                "issue",
                "create",
                "--repo",
                repo,
                "--title",
                title,
                "--body-file",
                body_file,
                "--label",
                tracker_label,
                "--label",
                "bot",
            ]
        )
        url = proc.stdout.strip()
        print(f"Issue criada: {url}")
        append_summary(f"Issue criada: {url}\n")
        return 0
    canonical = existing[0]
    note = f"Nova execução com o mesmo problema.\n\n{body}"
    run_gh(
        [
            "issue",
            "comment",
            str(canonical["number"]),
            "--repo",
            repo,
            "--body",
            note,
        ]
    )
    print(f"Comentário em #{canonical['number']}")
    append_summary(
        f"Issue atualizada: #{canonical['number']} (labels `{tracker_label}`, `bot`).\n"
    )
    for extra in existing[1:]:
        comment_and_close(
            repo,
            int(extra["number"]),
            "duplicate",
            (
                "Fechada como duplicata: o workflow reutiliza uma única issue "
                f"aberta para este problema (#{canonical['number']})."
            ),
            int(canonical["number"]),
        )
        print(f"Duplicata fechada: #{extra['number']}")
    return 0


def cmd_resolve(repo: str, title: str, tracker_label: str, body_file: str) -> int:
    existing = find_open_exact(repo, tracker_label, title)
    if not existing:
        print("Nenhuma issue aberta com esse título. Sucesso fica só no resumo.")
        append_summary("Nenhuma issue de bot em aberto para este verificador.\n")
        return 0
    body = read_body(body_file)
    note = f"Execução seguinte saudável. Fechando esta issue.\n\n{body}"
    for issue in existing:
        comment_and_close(repo, int(issue["number"]), "completed", note)
        print(f"Issue fechada: #{issue['number']}")
        append_summary(f"Issue fechada após execução saudável: #{issue['number']}.\n")
    return 0


def write_report(kind: str, out_path: str, to_summary: bool) -> int:
    env = {key: value for key, value in os.environ.items()}
    if kind == "cora":
        text = build_cora_report(env)
    else:
        text = build_deploy_report(env)
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(text)
    if to_summary:
        append_summary(text)
    print(text)
    return 0


def self_test() -> int:
    def issue(number: int, title: str, body: str, labels: list[str], login: str = "github-actions[bot]") -> dict:
        return {
            "number": number,
            "title": title,
            "body": body,
            "author": {"login": login, "is_bot": "github-actions" in login},
            "labels": labels,
        }

    synced = "**Resultado: SINCRONIZADO — banco em dia com a Cora**"
    gap = "**Resultado: GAP DETECTADO — 4 lançamentos na Cora faltam no banco**"
    probe = "**Resultado: AUDIT-PROBE HTTP 500**"

    later_success = plan_cleanup(
        [
            issue(10, "Auditoria Cora 2026-01-01T00:00:00Z", gap, ["cora-audit"]),
            issue(11, "Auditoria Cora 2026-01-02T00:00:00Z", synced, ["cora-audit"]),
            issue(12, "Auditoria Cora 2026-01-03T00:00:00Z", probe, ["cora-audit"]),
            issue(13, "Auditoria Cora 2026-01-04T00:00:00Z", synced, ["cora-audit"]),
            issue(20, "✅ Deploy OK: aaa", "ok", ["deploy-status"]),
            issue(21, "❌ Deploy com problemas: bbb", "ruim", ["deploy-status"]),
            issue(22, "✅ Deploy OK: ccc", "ok", ["deploy-status"]),
            issue(8, "🔍 Auditoria Cora — 2026-05-21T16:05:16Z", "HTTP 307", ["cora-audit"]),
            issue(45, "ci: conflito", "humano", ["bug"], login="contato22"),
            issue(46, "Auditoria Cora manual", synced, ["cora-audit"], login="contato22"),
            issue(47, "Outro assunto", "texto", ["cora-audit"]),
        ]
    )
    by_number = {item.number: item for item in later_success}
    assert set(by_number) == {8, 10, 11, 12, 13, 20, 21, 22}
    assert by_number[8].action == "close" and by_number[8].reason == "superseded"
    assert by_number[13].action == "close" and by_number[13].reason == "success"
    assert by_number[12].action == "close" and by_number[12].reason == "superseded"
    assert by_number[10].reason == "superseded"
    assert by_number[11].reason == "success"
    assert by_number[22].reason == "success"
    assert by_number[21].reason == "superseded"
    assert all(item.action == "close" for item in later_success)

    open_failure = plan_cleanup(
        [
            issue(1, "✅ Deploy OK: old", "", ["deploy-status"]),
            issue(2, "❌ Deploy com problemas: mid", "", ["deploy-status"]),
            issue(3, "Deploy com problemas", "falha", ["deploy-status"]),
            issue(4, "Auditoria Cora 2026-02-01T00:00:00Z", synced, ["cora-audit"]),
            issue(6, "Auditoria Cora 2026-02-02T00:00:00Z", gap, ["cora-audit"]),
            issue(7, "Auditoria Cora: divergência ou falha", gap, ["cora-audit"]),
        ]
    )
    by_number = {item.number: item for item in open_failure}
    assert by_number[7].action == "keep"
    assert by_number[6].action == "close" and by_number[6].reason == "duplicate"
    assert by_number[6].duplicate_of == 7
    assert by_number[4].reason == "success"
    assert by_number[3].action == "keep"
    assert by_number[2].reason == "duplicate" and by_number[2].duplicate_of == 3
    assert by_number[1].reason == "success"

    assert cora_is_healthy("200", "0")
    assert not cora_is_healthy("200", "3")
    assert not cora_is_healthy("500", "0")
    assert not cora_is_healthy("200", "n/a")
    assert deploy_is_healthy("true")
    assert not deploy_is_healthy("false")
    assert not deploy_is_healthy("")

    report = build_cora_report(
        {
            "HORA": "2026-10-15T00:00:00Z",
            "TODAY": "2026-10-15",
            "AUDIT_HTTP": "200",
            "MISSING": "0",
            "CORA_TOTAL": "10",
            "DB_TOTAL": "10",
            "RUN_URL": "https://example.test/run/1",
        }
    )
    assert "SINCRONIZADO" in report
    assert "GAP DETECTADO" not in report
    gap_report = build_cora_report(
        {"AUDIT_HTTP": "200", "MISSING": "4", "SYNC_HTTP": "200", "SYNCED": "4", "HORA": "t", "TODAY": "d"}
    )
    assert "GAP DETECTADO" in gap_report
    assert "AUTO-SYNC: 4" in gap_report
    fail_report = build_cora_report({"AUDIT_HTTP": "503", "MISSING": "n/a", "HORA": "t", "TODAY": "d"})
    assert "AUDIT-PROBE HTTP 503" in fail_report

    healthy_deploy = build_deploy_report({"ALL_GREEN": "true", "COMMIT_SHA": "abc", "HORA": "t"})
    assert "saudável" in healthy_deploy
    broken_deploy = build_deploy_report({"ALL_GREEN": "", "HORA": "t"})
    assert "falha" in broken_deploy

    # Autor via string (formato alternativo) e label desconhecida não entram.
    ignored = plan_cleanup(
        [
            {"number": 9, "title": "Auditoria Cora x", "body": synced, "author": "alguem", "labels": ["cora-audit"]},
        ]
    )
    assert ignored == []

    print("self-test ok")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--repo", default=None)
    parser = argparse.ArgumentParser(description="Issues de bot: dedupe, resumo e limpeza.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("self-test", parents=[parent])

    cleanup = sub.add_parser("cleanup", parents=[parent])
    cleanup.add_argument(
        "--apply",
        action="store_true",
        help="Fecha as issues. Sem esta flag o comando só lista (dry-run).",
    )

    for name in ("upsert", "resolve"):
        command = sub.add_parser(name, parents=[parent])
        command.add_argument("--title", required=True)
        command.add_argument("--tracker-label", required=True)
        command.add_argument("--body-file", required=True)

    for name in ("write-cora-report", "write-deploy-report"):
        command = sub.add_parser(name, parents=[parent])
        command.add_argument("--out", required=True)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "self-test":
        return self_test()
    repo = detect_repo(args.repo)
    if args.command == "cleanup":
        return cmd_cleanup(repo, apply=args.apply)
    if args.command == "upsert":
        return cmd_upsert(repo, args.title, args.tracker_label, args.body_file)
    if args.command == "resolve":
        return cmd_resolve(repo, args.title, args.tracker_label, args.body_file)
    if args.command == "write-cora-report":
        return write_report("cora", args.out, to_summary=True)
    if args.command == "write-deploy-report":
        return write_report("deploy", args.out, to_summary=False)
    parser.error(f"comando desconhecido: {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
