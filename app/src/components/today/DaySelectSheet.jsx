/**
 * components/today/DaySelectSheet.jsx — A7b explicit day choice (D10).
 * Every day template is listed, sorted; the suggested one is marked. D10 is
 * binding: this is guidance only — any day is tappable, never forced.
 */
import BottomSheet from '../BottomSheet.jsx'

const DAY_TYPE_LABEL = { training: 'Training', rest: 'Rest', recovery: 'Recovery', custom: 'Custom / Free-form' }

export default function DaySelectSheet({ open, onClose, days, suggestedDay, onChoose }) {
    return (
        <BottomSheet open={open} onClose={onClose} title="Choose a day">
            {days.map((day) => (
                <button
                    key={day.day}
                    type="button"
                    className="sheet__action today-day-row"
                    onClick={() => { onChoose(day.day); onClose() }}
                >
                    <span className="today-day-row__label">{day.label}</span>
                    <span className="today-day-row__meta">
                        {DAY_TYPE_LABEL[day.type] || day.type}
                        {day.sectionCount > 0 ? ` · ${day.sectionCount} section${day.sectionCount === 1 ? '' : 's'}` : ''}
                    </span>
                    {day.day === suggestedDay && <span className="badge badge-amber">Suggested</span>}
                </button>
            ))}
        </BottomSheet>
    )
}
