import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../../assets/start.png";
import stop from "../../assets/stop.png";



export default function MeetingRecordStartPage() {
  const [recording, setRecording] = useState(false);
  const navigate = useNavigate();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        await uploadAudio(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("마이크 접근 실패:", err);
      alert("마이크 권한을 허용해주세요.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const uploadAudio = async (blob: Blob) => {
    const formData = new FormData();

    formData.append("audio", blob, `meeting-1.webm`);

    const res = await fetch(`http://localhost:8000/api/meetings/1/end/`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log(data);

    navigate("/meeting/record/result");
  };

  return (
    <div className="h-[calc(100vh-64px)] flex-col px-6">
      <section className="flex h-full">

        {/* 왼쪽 */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center">
              <p className="mb-10 text-3xl text-gray-500 cafe24-font">
                {recording
                  ? "회의가 녹음 중 입니다."
                  : "버튼을 눌러 회의 녹음을 시작하세요"}
              </p>

              <button onClick={recording ? stopRecording : startRecording}>
                <img
                  src={recording ? stop : logo}
                  alt="record-button"
                  className="h-40 w-40"
                />
              </button>

            {audioUrl && (
              <audio controls className="mt-5">
                <source src={audioUrl} type="audio/webm" />
              </audio>
            )}
          </div>
        </div>

        {/* 오른쪽 채팅창 */}
        {recording && (
          <div className="w-[400px] mt-23 border-l h-[calc(100vh-120px)] rounded-2xl border-gray-200 flex flex-col bg-gray-100 p-5">
            <h2 className="mb-4 text-2xl cafe24-font">
              회의 도우미 챗봇
            </h2>

            <div className="flex h-[80%] flex-col gap-3 overflow-y-auto rounded-xl bg-gray-100 p-4">
              <div className="self-start rounded-2xl bg-white px-4 py-2 shadow">
                안녕하세요
              </div>

              <div className="self-end rounded-2xl bg-blue-500 px-4 py-2 text-white">
                네 확인했습니다
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-4">
              <input
                type="text"
                placeholder="메시지를 입력하세요"
                className="flex-1 rounded-xl border px-3 py-2 outline-none"
              />

              <button className="rounded-xl bg-black px-4 py-2 text-white">
                전송
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}