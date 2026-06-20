import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTaskList, registerJiraTasks, type Task } from "../../services/meeting";

const PRIORITY_COLOR: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-blue-100 text-blue-600",
  Lowest: "bg-gray-100 text-gray-500",
};
const PRIORITY_LABEL: Record<string, string> = {
  High: "높음", Medium: "중간", Low: "낮음", Lowest: "최하",
};

export default function JiraTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [registered, setRegistered] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    getTaskList(meetingId)
      .then(list => {
        setTasks(list);
        setSelected(list.map(t => t.meeting_task_id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingId]);

  const toggle = (taskId: number) => {
    if (registered.includes(taskId)) return;
    setSelected(prev => prev.includes(taskId) ? prev.filter(x => x !== taskId) : [...prev, taskId]);
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const res = await registerJiraTasks(meetingId, selected);
      const registeredIds = res.registered.map(r => r.task_id);
      setRegistered(prev => [...prev, ...registeredIds]);
      setSelected([]);
      if (res.failed.length > 0) {
        alert(`일부 태스크 등록 실패: ${res.failed.length}건`);
      }
    } catch {
      alert("Jira 등록에 실패했습니다.");
    } finally {
      setRegistering(false);
    }
  };

  const stepLabels = ["회의록 검토 & 태스크 수정", "Jira 태스크 등록", "요약 메일 발송"];

  return (
    <div className="p-8">
   
    </div>
  );
}
