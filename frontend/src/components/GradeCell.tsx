import { MouseEvent, CSSProperties } from 'react'
import { AttendStatus } from '../types'

interface GradeCellProps {
  grade: number | null
  status: AttendStatus
  isExpelled: boolean
  isNew: boolean
  highlightBg?: string
  onLeftClick: () => void
  onRightClick: (e: MouseEvent) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const statusBg: Record<AttendStatus, string> = {
  PRESENT: '#fff',
  ABSENT: '#fff1f0',
  LATE: '#fffbe6'
}

const statusLabel: Record<AttendStatus, string> = {
  PRESENT: '',
  ABSENT: 'Н',
  LATE: 'О'
}

export default function GradeCell({
  grade,
  status,
  isExpelled,
  isNew,
  highlightBg,
  onLeftClick,
  onRightClick,
  onMouseEnter,
  onMouseLeave
}: GradeCellProps) {
  const background = highlightBg || statusBg[status]

  const style: CSSProperties = {
    width: 46,
    height: 36,
    textAlign: 'center',
    verticalAlign: 'middle',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #f0f0f0',
    background,
    opacity: isExpelled ? 0.35 : 1,
    color: isNew && grade === null && status === 'PRESENT'
      ? '#1677ff'
      : status === 'ABSENT'
      ? '#ff4d4f'
      : status === 'LATE'
      ? '#d48806'
      : '#333',
    userSelect: 'none',
    transition: 'background 0.1s',
    padding: 0
  }

  return (
    <td
      style={style}
      onClick={onLeftClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(e) }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {grade !== null ? grade : statusLabel[status]}
    </td>
  )
}
