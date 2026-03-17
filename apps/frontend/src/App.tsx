import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { apiRequest, Session } from "./api";

type Message = { type: "error" | "success"; text: string } | null;
type DetailType = "attendance" | "leave" | "overtime" | "approvals";

type DashboardData = {
  users: any[];
  attendance: any[];
  leaveRequests: any[];
  overtimeRequests: any[];
  pendingApprovals: any[];
  delegations: any[];
};

function notify(onMessage: (message: Message) => void, type: "error" | "success", text: string) {
  onMessage({ type, text });
}

function roleLabel(role: string): string {
  if (role === "admin") return "管理者";
  if (role === "employee") return "一般使用者";
  return role;
}

function useSession() {
  const [session, setSessionState] = useState<Session | null>(() => {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      localStorage.removeItem("session");
      return null;
    }
  });

  const setSession = (next: Session | null) => {
    setSessionState(next);
    if (next) {
      localStorage.setItem("session", JSON.stringify(next));
    } else {
      localStorage.removeItem("session");
    }
  };

  return { session, setSession };
}

export function App() {
  const { session, setSession } = useSession();
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!session) {
    return <LoginPanel onLoggedIn={setSession} onMessage={setMessage} message={message} />;
  }

  if (session.user.mustResetPassword) {
    return <ResetPasswordPanel session={session} onLoggedIn={setSession} onMessage={setMessage} message={message} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard session={session} onLogout={() => setSession(null)} onMessage={setMessage} message={message} />} />
      <Route path="/details/:type" element={<DetailPage session={session} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoginPanel({ onLoggedIn, onMessage, message }: { onLoggedIn: (session: Session) => void; onMessage: (message: Message) => void; message: Message }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("resetToken") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot" | "reset">(() => (new URLSearchParams(window.location.search).get("resetToken") ? "reset" : "login"));

  const switchMode = (next: "login" | "forgot" | "reset") => {
    setMode(next);
    if (next !== "reset") {
      const url = new URL(window.location.href);
      url.searchParams.delete("resetToken");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const session = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      notify(onMessage, "success", "Login successful");
      onLoggedIn(session);
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  const submitForgotPassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail })
      });
      notify(onMessage, "success", response.message);
      setForgotEmail("");
      switchMode("login");
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  const submitResetByToken = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const session = await apiRequest<Session>("/auth/reset-password-by-token", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      notify(onMessage, "success", "Password reset completed");
      const url = new URL(window.location.href);
      url.searchParams.delete("resetToken");
      window.history.replaceState({}, "", url.pathname + url.search);
      onLoggedIn(session);
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <main className="layout auth-layout">
      <section className="auth-hero">
        <h1 className="brand-title">Attendance Management System</h1>
        <p className="brand-subtitle">Handle attendance, leave, overtime, and approvals in one place.</p>
      </section>
      {mode === "login" && (
        <form className="card auth-card" onSubmit={submitLogin}>
          <h2>Login</h2>
          <label className="field">
            <span>Email</span>
            <input autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="primary-btn wide-btn" type="submit">Login</button>
          <button className="link-btn" type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>
          {message && <p className={"inline-message " + message.type}>{message.text}</p>}
        </form>
      )}
      {mode === "forgot" && (
        <form className="card auth-card" onSubmit={submitForgotPassword}>
          <h2>Forgot Password</h2>
          <label className="field">
            <span>Email</span>
            <input autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
          </label>
          <button className="primary-btn wide-btn" type="submit">Send reset link</button>
          <button className="link-btn" type="button" onClick={() => switchMode("login")}>Back to login</button>
          {message && <p className={"inline-message " + message.type}>{message.text}</p>}
        </form>
      )}
      {mode === "reset" && (
        <form className="card auth-card" onSubmit={submitResetByToken}>
          <h2>Reset Password</h2>
          <label className="field">
            <span>Reset Token</span>
            <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
          </label>
          <label className="field">
            <span>New password</span>
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <button className="primary-btn wide-btn" type="submit">Complete reset</button>
          <button className="link-btn" type="button" onClick={() => switchMode("login")}>Back to login</button>
          {message && <p className={"inline-message " + message.type}>{message.text}</p>}
        </form>
      )}
    </main>
  );
}

function ResetPasswordPanel({ session, onLoggedIn, onMessage, message }: { session: Session; onLoggedIn: (session: Session) => void; onMessage: (message: Message) => void; message: Message }) {
  const [newPassword, setNewPassword] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest<{ message: string }>(
        "/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ userId: session.user.id, newPassword })
        },
        session.token
      );

      const refreshed = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: session.user.email, password: newPassword })
      });
      notify(onMessage, "success", "密碼重設完成");
      onLoggedIn(refreshed);
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <main className="layout auth-layout">
      <form className="card auth-card" onSubmit={submit}>
        <h2>重設密碼</h2>
        <label className="field">
          <span>新密碼</span>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <button className="primary-btn wide-btn" type="submit">送出</button>
        {message && <p className={`inline-message ${message.type}`}>{message.text}</p>}
      </form>
    </main>
  );
}

function Dashboard({ session, onLogout, onMessage, message }: { session: Session; onLogout: () => void; onMessage: (message: Message) => void; message: Message }) {
  const [data, setData] = useState<DashboardData>({
    users: [],
    attendance: [],
    leaveRequests: [],
    overtimeRequests: [],
    pendingApprovals: [],
    delegations: []
  });

  const isAdmin = session.user.roleName === "admin";

  const loadAll = async () => {
    try {
      const next: DashboardData = {
        users: [],
        attendance: [],
        leaveRequests: [],
        overtimeRequests: [],
        pendingApprovals: [],
        delegations: []
      };

      if (isAdmin) {
        next.users = await apiRequest<any[]>("/users", {}, session.token);
      }

      const today = new Date().toISOString().slice(0, 10);
      next.attendance = await apiRequest<any[]>(`/attendance?startDate=${today}&endDate=${today}`, {}, session.token);
      next.leaveRequests = await apiRequest<any[]>("/leave-requests", {}, session.token);
      next.overtimeRequests = await apiRequest<any[]>("/overtime-requests", {}, session.token);
      next.pendingApprovals = await apiRequest<any[]>("/approvals/pending", {}, session.token);
      next.delegations = await apiRequest<any[]>("/delegations", {}, session.token);

      setData(next);
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const stats = useMemo(
    () => ({
      attendance: data.attendance.length,
      leave: data.leaveRequests.length,
      overtime: data.overtimeRequests.length,
      approvals: data.pendingApprovals.length
    }),
    [data.attendance.length, data.leaveRequests.length, data.overtimeRequests.length, data.pendingApprovals.length]
  );

  const openDetail = (type: DetailType) => {
    window.open(`/details/${type}`, "_blank", "noopener,noreferrer");
  };

  const clockIn = async () => {
    await apiRequest("/attendance/clock-in", { method: "POST", body: JSON.stringify({}) }, session.token);
    notify(onMessage, "success", "上班打卡完成");
    await loadAll();
  };

  const clockOut = async () => {
    await apiRequest("/attendance/clock-out", { method: "POST", body: JSON.stringify({}) }, session.token);
    notify(onMessage, "success", "下班打卡完成");
    await loadAll();
  };

  return (
    <main className="layout dashboard-layout">
      <header className="dashboard-header">
        <div>
          <h1>出缺勤儀表板</h1>
          <p className="muted">歡迎回來，{session.user.email}</p>
        </div>
        <div className="row gap wrap">
          <button className="secondary-btn" onClick={loadAll}>重新整理</button>
          <button className="ghost-btn" onClick={onLogout}>登出</button>
        </div>
      </header>

      <section className="stats-grid">
        <button className="card card-link metric-card" onClick={() => openDetail("attendance")}>
          <h3>打卡紀錄</h3>
          <p>{stats.attendance}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link metric-card" onClick={() => openDetail("leave")}>
          <h3>請假</h3>
          <p>{stats.leave}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link metric-card" onClick={() => openDetail("overtime")}>
          <h3>加班</h3>
          <p>{stats.overtime}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link metric-card" onClick={() => openDetail("approvals")}>
          <h3>待簽核</h3>
          <p>{stats.approvals}</p>
          <small>點擊查看明細</small>
        </button>
      </section>

      <section className="row gap wrap quick-actions">
        <button className="primary-btn" onClick={clockIn}>上班打卡</button>
        <button className="secondary-btn" onClick={clockOut}>下班打卡</button>
      </section>

      {isAdmin && <AdminPanel token={session.token} users={data.users} onMessage={onMessage} onSaved={loadAll} />}
      <RequestPanels token={session.token} onMessage={onMessage} onSaved={loadAll} />
      <ApprovalsPanel token={session.token} pending={data.pendingApprovals} onMessage={onMessage} onSaved={loadAll} />
      <DelegationPanel token={session.token} delegations={data.delegations} users={data.users} onMessage={onMessage} onSaved={loadAll} />

      {message && <p className={`inline-message ${message.type}`}>{message.text}</p>}
    </main>
  );
}

function DetailPage({ session }: { session: Session }) {
  const { type } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detailType = (type ?? "") as DetailType;
  const validType = ["attendance", "leave", "overtime", "approvals"].includes(detailType);

  const titleMap: Record<DetailType, string> = {
    attendance: "打卡紀錄明細",
    leave: "請假單明細",
    overtime: "加班單明細",
    approvals: "待簽核明細"
  };

  useEffect(() => {
    if (!validType) {
      navigate("/", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (detailType === "attendance") {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 30);
          const startDate = start.toISOString().slice(0, 10);
          const endDate = end.toISOString().slice(0, 10);
          const data = await apiRequest<any[]>(`/attendance?startDate=${startDate}&endDate=${endDate}`, {}, session.token);
          setRows(data);
        } else if (detailType === "leave") {
          setRows(await apiRequest<any[]>("/leave-requests", {}, session.token));
        } else if (detailType === "overtime") {
          setRows(await apiRequest<any[]>("/overtime-requests", {}, session.token));
        } else {
          setRows(await apiRequest<any[]>("/approvals/pending", {}, session.token));
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [type]);

  if (!validType) return null;

  return (
    <main className="layout detail-layout">
      <header className="row between">
        <h1>{titleMap[detailType]}</h1>
        <button className="ghost-btn" onClick={() => window.close()}>關閉</button>
      </header>

      {loading && <p className="muted">載入中...</p>}
      {error && <p className="inline-message error">{error}</p>}
      {!loading && !error && <DetailTable type={detailType} rows={rows} />}
    </main>
  );
}

function DetailTable({ type, rows }: { type: DetailType; rows: any[] }) {
  if (!rows.length) {
    return <p>目前沒有資料。</p>
  }

  const columns: Record<DetailType, string[]> = {
    attendance: ["attendance_date", "clock_in_at", "clock_out_at"],
    leave: ["leave_type", "start_at", "end_at", "reason", "status", "created_at"],
    overtime: ["start_at", "end_at", "reason", "status", "created_at"],
    approvals: ["type", "start_at", "end_at", "reason", "status", "created_at"]
  };

  const headers = columns[type];

  return (
    <div className="card table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {headers.map((h) => (
                <td key={`${row.id ?? idx}-${h}`}>{String(row[h] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminPanel({ token, users, onMessage, onSaved }: { token: string; users: any[]; onMessage: (message: Message) => void; onSaved: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState<"admin" | "employee">("employee");
  const [approverId, setApproverId] = useState("");

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest("/users", { method: "POST", body: JSON.stringify({ email, fullName, roleName, approverId: approverId || undefined }) }, token);
      notify(onMessage, "success", "使用者建立成功，已寄送臨時密碼信件");
      setEmail("");
      setFullName("");
      setApproverId("");
      await onSaved();
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>管理者使用者管理</h2>
      <form className="form-grid" onSubmit={createUser}>
        <input placeholder="電子郵件" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="姓名" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <select value={roleName} onChange={(e) => setRoleName(e.target.value as "admin" | "employee")}>
          <option value="employee">一般使用者</option>
          <option value="admin">管理者</option>
        </select>
        <input placeholder="簽核者 ID（選填）" value={approverId} onChange={(e) => setApproverId(e.target.value)} />
        <button className="primary-btn" type="submit">新增使用者</button>
      </form>
      <ul className="item-list">{users.map((user) => <li key={user.id}>{user.full_name} ({user.email}) - {roleLabel(user.role_name)}</li>)}</ul>
    </section>
  );
}

function RequestPanels({ token, onMessage, onSaved }: { token: string; onMessage: (message: Message) => void; onSaved: () => Promise<void> }) {
  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [otStart, setOtStart] = useState("");
  const [otEnd, setOtEnd] = useState("");
  const [otReason, setOtReason] = useState("");

  const createLeave = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest("/leave-requests", { method: "POST", body: JSON.stringify({ leaveType, startAt: leaveStart, endAt: leaveEnd, reason: leaveReason }) }, token);
      notify(onMessage, "success", "請假申請已送出");
      await onSaved();
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  const createOvertime = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest("/overtime-requests", { method: "POST", body: JSON.stringify({ startAt: otStart, endAt: otEnd, reason: otReason }) }, token);
      notify(onMessage, "success", "加班申請已送出");
      await onSaved();
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <section className="request-grid">
      <form className="card request-card" onSubmit={createLeave}>
        <h2>請假申請</h2>
        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
          <option value="annual">年假</option>
          <option value="compensatory">補休</option>
        </select>
        <input placeholder="開始時間（ISO 格式）" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
        <input placeholder="結束時間（ISO 格式）" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
        <input placeholder="請假原因" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} required />
        <button className="primary-btn" type="submit">送出請假</button>
      </form>
      <form className="card request-card" onSubmit={createOvertime}>
        <h2>加班申請</h2>
        <input placeholder="開始時間（ISO 格式）" value={otStart} onChange={(e) => setOtStart(e.target.value)} required />
        <input placeholder="結束時間（ISO 格式）" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} required />
        <input placeholder="加班原因" value={otReason} onChange={(e) => setOtReason(e.target.value)} required />
        <button className="primary-btn" type="submit">送出加班</button>
      </form>
    </section>
  );
}

function ApprovalsPanel({ token, pending, onMessage, onSaved }: { token: string; pending: any[]; onMessage: (message: Message) => void; onSaved: () => Promise<void> }) {
  const decide = async (item: any, decision: "approved" | "rejected") => {
    try {
      const path =
        item.type === "leave"
          ? `/approvals/leave/${item.id}/decision`
          : item.type === "overtime"
            ? `/approvals/overtime/${item.id}/decision`
            : `/approvals/attendance-corrections/${item.id}/decision`;
      await apiRequest(path, { method: "POST", body: JSON.stringify({ decision }) }, token);
      notify(onMessage, "success", `申請已${decision === "approved" ? "核准" : "駁回"}`);
      await onSaved();
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };
  return (
    <section className="card">
      <h2>簽核收件匣</h2>
      <ul className="item-list">
        {pending.map((item) => (
          <li className="approval-item" key={`${item.type}-${item.id}`}>
            <span>{(item.type === "leave" ? "請假" : item.type === "overtime" ? "加班" : "忘打卡補登")} | {item.reason}</span>
            <div className="row gap">
              <button className="primary-btn" onClick={() => decide(item, "approved")}>核准</button>
              <button className="danger-btn" onClick={() => decide(item, "rejected")}>駁回</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DelegationPanel({ token, delegations, users, onMessage, onSaved }: { token: string; delegations: any[]; users: any[]; onMessage: (message: Message) => void; onSaved: () => Promise<void> }) {
  const [delegateUserId, setDelegateUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const createDelegation = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest("/delegations", { method: "POST", body: JSON.stringify({ delegateUserId, startDate, endDate }) }, token);
      notify(onMessage, "success", "代理設定已建立");
      await onSaved();
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>代理人設定</h2>
      <form className="form-grid" onSubmit={createDelegation}>
        <select value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)}>
          <option value="">請選擇代理人</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
        <input placeholder="開始日期 YYYY-MM-DD" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <input placeholder="結束日期 YYYY-MM-DD" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        <button className="primary-btn" type="submit">儲存</button>
      </form>
      <ul className="item-list">{delegations.map((item) => <li key={item.id}>{item.delegate_user_id} ({item.start_date} - {item.end_date})</li>)}</ul>
    </section>
  );
}



