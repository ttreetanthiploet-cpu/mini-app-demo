import BotAvatar from "@/components/bot-avatar";
import { IcRestructure, IcBill, IcLoan, IcGo } from "@/components/icons";

const BOT_NAME = "น้องฟิน";

const TOPICS: { act: string; text?: string; Icon: React.FC; title: string; sub: string }[] = [
  {
    act: "restructure",
    Icon: IcRestructure,
    title: "ปรึกษาแก้ปัญหาหนี้ส่วนบุคคล",
    sub: "ระบุบัญชี ปัญหา และยอดที่ยินดีจ่าย",
  },
  {
    act: "free",
    text: "สอบถามข้อมูลโครงการภาครัฐ เช่น โครงการคุณสู้เราช่วย และโครงการปิดหนี้ไวไปต่อได้",
    Icon: IcBill,
    title: "สอบถามข้อมูลโครงการภาครัฐ",
    sub: "คุณสู้เราช่วย · ปิดหนี้ไวไปต่อได้ และอื่น ๆ",
  },
  {
    act: "free",
    text: "สอบถามแนวทางการแก้ปัญหาหนี้ของธนาคาร อยากทราบว่า TDR คืออะไร และอยากรวมหนี้ต้องมีคุณสมบัติอะไรบ้าง",
    Icon: IcLoan,
    title: "สอบถามแนวทางการแก้ปัญหาหนี้ของธนาคาร",
    sub: "TDR · รวมหนี้ · คุณสมบัติที่ต้องมี",
  },
];

interface WelcomeProps {
  onPick: (act: string, text?: string) => void;
}

export default function Welcome({ onPick }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-avatar">
          <BotAvatar size={64} float />
        </div>
        <h1 className="welcome-greet">สวัสดีค่ะ ยินดีให้คำปรึกษา</h1>
        <p className="welcome-sub">
          ดิฉัน <b>{BOT_NAME}</b> ผู้ช่วยที่ปรึกษาทางการเงิน ดูแลเรื่องการปรับโครงสร้างหนี้
          และผลิตภัณฑ์ธนาคารกรุงไทย เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามได้เลยค่ะ
        </p>
      </div>
      <div className="suggest-label">หัวข้อยอดนิยม</div>
      <div className="suggest-list">
        {TOPICS.map((item) => (
          <button key={item.title} className="suggest-card" onClick={() => onPick(item.act, item.text)}>
            <span className="suggest-ico">
              <item.Icon />
            </span>
            <span className="suggest-txt">
              {item.title}
              <span className="suggest-sub">{item.sub}</span>
            </span>
            <span className="suggest-go">
              <IcGo />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
