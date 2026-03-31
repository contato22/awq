import Header from "@/components/Header";
import { Settings, Bell, Shield, Palette, Database, Users } from "lucide-react";

interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
          <Icon size={16} />
        </div>
        <div>
          <div className="font-semibold text-gray-400">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}

function ToggleRow({ label, description, defaultChecked = false }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm text-gray-400">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      <div
        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
          defaultChecked ? "bg-brand-600" : "bg-gray-200"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            defaultChecked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" subtitle="Manage your JACQES BI workspace preferences" />

      <div className="px-8 py-6 space-y-4">
        <SettingsSection
          icon={Settings}
          title="General"
          description="Workspace and display preferences"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                defaultValue="JACQES BI"
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Default Currency
              </label>
              <select className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-brand-500">
                <option>USD — US Dollar</option>
                <option>EUR — Euro</option>
                <option>GBP — British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Fiscal Year Start
              </label>
              <select className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-brand-500">
                <option>January</option>
                <option>April</option>
                <option>July</option>
                <option>October</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Time Zone</label>
              <select className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-brand-500">
                <option>UTC+0 — London</option>
                <option>UTC-5 — New York</option>
                <option>UTC+8 — Singapore</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Configure alerts and notification delivery"
        >
          <ToggleRow label="Revenue milestone alerts" defaultChecked={true} />
          <ToggleRow label="At-risk customer warnings" description="Alert when churn probability > 70%" defaultChecked={true} />
          <ToggleRow label="Weekly digest email" defaultChecked={true} />
          <ToggleRow label="Slack integration alerts" description="Post to #analytics channel" defaultChecked={false} />
          <ToggleRow label="Data refresh notifications" defaultChecked={false} />
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Security & Access"
          description="Manage team permissions and data access"
        >
          <div className="space-y-2">
            {[
              { name: "Alex Whitmore", email: "alex@awqgroup.com", role: "Owner" },
              { name: "Sam Chen", email: "s.chen@jacqes.com", role: "Admin" },
              { name: "Priya Nair", email: "p.nair@jacqes.com", role: "Analyst" },
              { name: "Danilo", email: "danilo@jacqes.com", role: "CS Ops" },
            ].map((member) => (
              <div key={member.email} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-[10px] font-bold text-gray-900">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-400">{member.name}</div>
                  <div className="text-xs text-gray-400">{member.email}</div>
                </div>
                <span className="badge badge-blue">{member.role}</span>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-xs mt-2">+ Invite Member</button>
        </SettingsSection>

        <SettingsSection
          icon={Database}
          title="Data Sources"
          description="Connected integrations and data pipelines"
        >
          {[
            { name: "Stripe", status: "Connected", lastSync: "2 min ago" },
            { name: "Salesforce CRM", status: "Connected", lastSync: "15 min ago" },
            { name: "Google Analytics", status: "Connected", lastSync: "1 hr ago" },
            { name: "HubSpot", status: "Disconnected", lastSync: "—" },
          ].map((source) => (
            <div key={source.name} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-400">{source.name}</div>
                <div className="text-xs text-gray-400">Last sync: {source.lastSync}</div>
              </div>
              <span
                className={`badge ${source.status === "Connected" ? "badge-green" : "badge-red"}`}
              >
                {source.status}
              </span>
            </div>
          ))}
        </SettingsSection>

        {/* Save button */}
        <div className="flex justify-end">
          <button className="btn-primary">Save Changes</button>
        </div>
      </div>
    </>
  );
}
