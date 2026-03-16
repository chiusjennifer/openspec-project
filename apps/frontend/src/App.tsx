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
  window.alert(text);
}

function roleLabel(role: string): string {
  if (role === "admin") return "管理者";
  if (role === "employee") return "一般使用者";
  return role;
}

function useSession() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("session");
    return raw ? (JSON.parse(raw) as Session) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem("session", JSON.stringify(session));
    } else {
      localStorage.removeItem("session");
    }
  }, [session]);

  return { session, setSession };
}

export function App() {
  const { session, setSession } = useSession();
  const [message, setMessage] = useState<Message>(null);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const session = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      notify(onMessage, "success", "登入成功");
      onLoggedIn(session);
    } catch (error) {
      notify(onMessage, "error", (error as Error).message);
    }
  };

  return (
    <main className="layout">
      <h1>出缺勤管理系統</h1>
      <form className="card" onSubmit={submit}>
        <h2>登入</h2>
        <label>電子郵件<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>密碼<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button type="submit">登入</button>
        {message && <p className={message.type}>{message.text}</p>}
      </form>
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
    <main className="layout">
      <form className="card" onSubmit={submit}>
        <h2>重設密碼</h2>
        <label>新密碼<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
        <button type="submit">送出</button>
        {message && <p className={message.type}>{message.text}</p>}
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
    notify(onMessage, "success", "上班打卡成功");
    await loadAll();
  };

  const clockOut = async () => {
    await apiRequest("/attendance/clock-out", { method: "POST", body: JSON.stringify({}) }, session.token);
    notify(onMessage, "success", "下班打卡成功");
    await loadAll();
  };

  return (
    <main className="layout">
      <header className="row between">
        <h1>出缺勤儀表板</h1>
        <div className="row gap">
          <button onClick={loadAll}>重新整理</button>
          <button onClick={onLogout}>登出</button>
        </div>
      </header>

      <section className="row cards">
        <button className="card card-link" onClick={() => openDetail("attendance")}>
          <h3>打卡紀錄</h3>
          <p>{stats.attendance}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link" onClick={() => openDetail("leave")}>
          <h3>請假單</h3>
          <p>{stats.leave}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link" onClick={() => openDetail("overtime")}>
          <h3>加班單</h3>
          <p>{stats.overtime}</p>
          <small>點擊查看明細</small>
        </button>
        <button className="card card-link" onClick={() => openDetail("approvals")}>
          <h3>待簽核</h3>
          <p>{stats.approvals}</p>
          <small>點擊查看明細</small>
        </button>
      </section>

      <section className="row gap wrap">
        <button onClick={clockIn}>上班打卡</button>
        <button onClick={clockOut}>下班打卡</button>
      </section>

      {isAdmin && <AdminPanel token={session.token} users={data.users} onMessage={onMessage} onSaved={loadAll} />}
      <RequestPanels token={session.token} onMessage={onMessage} onSaved={loadAll} />
      <ApprovalsPanel token={session.token} pending={data.pendingApprovals} onMessage={onMessage} onSaved={loadAll} />
      <DelegationPanel token={session.token} delegations={data.delegations} users={data.users} onMessage={onMessage} onSaved={loadAll} />

      {message && <p className={message.type}>{message.text}</p>}
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
    <main className="layout">
      <header className="row between">
        <h1>{titleMap[detailType]}</h1>
        <button onClick={() => window.close()}>關閉分頁</button>
      </header>

      {loading && <p>載入中...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <DetailTable type={detailType} rows={rows} />}
    </main>
  );
}

function DetailTable({ type, rows }: { type: DetailType; rows: any[] }) {
  if (!rows.length) {
    return <p>目前沒有資料。</p>;
  }

  const columns: Record<DetailType, string[]> = {
    attendance: ["attendance_date", "clock_in_at", "clock_out_at"],
    leave: ["leave_type", "start_at", "end_at", "reason", "status", "created_at"],
    overtime: ["start_at", "end_at", "reason", "status", "created_at"],
    approvals: ["type", "start_at", "end_at", "reason", "status", "created_at"]
  };

  const headers = columns[type];

  return (
    <div className="card">
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
      <form className="row wrap" onSubmit={createUser}>
        <input placeholder="電子郵件" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="姓名" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <select value={roleName} onChange={(e) => setRoleName(e.target.value as "admin" | "employee")}>
          <option value="employee">一般使用者</option>
          <option value="admin">管理者</option>
        </select>
        <input placeholder="簽核者 ID（選填）" value={approverId} onChange={(e) => setApproverId(e.target.value)} />
        <button type="submit">新增使用者</button>
      </form>
      <ul>{users.map((user) => <li key={user.id}>{user.full_name} ({user.email}) - {roleLabel(user.role_name)}</li>)}</ul>
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
    <section className="row cards">
      <form className="card" onSubmit={createLeave}>
        <h2>請假申請</h2>
        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
          <option value="annual">年假</option>
          <option value="compensatory">補休</option>
        </select>
        <input placeholder="開始時間（ISO 格式）" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
        <input placeholder="結束時間（ISO 格式）" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
        <input placeholder="請假原因" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
        <button type="submit">送出請假</button>
      </form>
      <form className="card" onSubmit={createOvertime}>
        <h2>加班申請</h2>
        <input placeholder="開始時間（ISO 格式）" value={otStart} onChange={(e) => setOtStart(e.target.value)} />
        <input placeholder="結束時間（ISO 格式）" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} />
        <input placeholder="加班原因" value={otReason} onChange={(e) => setOtReason(e.target.value)} />
        <button type="submit">送出加班</button>
      </form>
    </section>
  );
}

function ApprovalsPanel({ token, pending, onMessage, onSaved }: { token: string; pending: any[]; onMessage: (message: Message) => void; onSaved: () => Promise<void> }) {
  const decide = async (item: any, decision: "approved" | "rejected") => {
    try {
      const path = item.type === "leave" ? `/approvals/leave/${item.id}/decision` : `/approvals/overtime/${item.id}/decision`;
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
      <ul>
        {pending.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            {(item.type === "leave" ? "請假" : "加班")} | {item.reason}
            <button onClick={() => decide(item, "approved")}>核准</button>
            <button onClick={() => decide(item, "rejected")}>駁回</button>
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
      <form className="row wrap" onSubmit={createDelegation}>
        <select value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)}>
          <option value="">請選擇代理人</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
        <input placeholder="開始日期 YYYY-MM-DD" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input placeholder="結束日期 YYYY-MM-DD" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="submit">儲存</button>
      </form>
      <ul>{delegations.map((item) => <li key={item.id}>{item.delegate_user_id} ({item.start_date} - {item.end_date})</li>)}</ul>
    </section>
  );
}
