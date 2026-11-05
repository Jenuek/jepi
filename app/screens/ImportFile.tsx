// The "백업 파일 불러오기" file box (처음 설정 · 내 계획 · 설정): the chosen file goes to the old code (importBackup).
import { app } from '../ui/host';

export function ImportFile() {
  return <input type="file" accept=".json,application/json" className="importFile" onChange={e => app().importFile(e.currentTarget.files ? e.currentTarget.files[0] : undefined)} />;
}
