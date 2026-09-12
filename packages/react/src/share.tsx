export type ShareMember = {
  id: string;
  name: string;
  email?: string;
  role: string;
};

export type ShareDirectoryUser = {
  id: string;
  name: string;
  email: string;
};

const DEFAULT_ROLES = ["viewer", "commenter", "suggester", "editor", "administrator"] as const;

export function SharePanel({
  members,
  directory,
  canManage,
  roles = DEFAULT_ROLES,
  onShare,
  onRevoke,
}: {
  members: ShareMember[];
  directory?: ShareDirectoryUser[];
  canManage: boolean;
  roles?: readonly string[];
  onShare: (email: string, role: string) => Promise<void> | void;
  onRevoke: (userId: string) => Promise<void> | void;
}) {
  return (
    <section className="realtime-share" aria-label="Sharing">
      <h3>Sharing</h3>
      <p style={{ fontSize: 12, color: "#57534e" }}>
        Membership lives in the integrator app. The next room token uses the new role.
      </p>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.name} · {member.role}
            {canManage ? (
              <button type="button" onClick={() => void onRevoke(member.id)}>
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const email = String(data.get("email") ?? "");
            const role = String(data.get("role") ?? "viewer");
            if (email) void onShare(email, role);
            event.currentTarget.reset();
          }}
        >
          <label>
            Invite email
            <input name="email" type="email" list="realtime-share-directory" required />
          </label>
          <datalist id="realtime-share-directory">
            {(directory ?? []).map((user) => (
              <option key={user.id} value={user.email}>
                {user.name}
              </option>
            ))}
          </datalist>
          <label>
            Role
            <select name="role" defaultValue="suggester">
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Share</button>
        </form>
      ) : null}
    </section>
  );
}
