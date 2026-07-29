/**
 * components/today/CategorySheet.jsx — A7b (D11 §3) category picker.
 * Shown only for a `custom` day, whose sessionCategory cannot be fixed by
 * dayType alone (utils/sessionCategory.js's fixedCategoryForDayType).
 * Never offers "rest"/"recovery" — those categories are reserved for their
 * own dedicated dayTypes.
 */
import BottomSheet from '../BottomSheet.jsx'
import { PICKER_CATEGORIES } from '../../utils/sessionCategory.js'

const CATEGORY_LABEL = {
    'strength-conditioning': 'Strength & Conditioning',
    combat: 'Combat',
    custom: 'Custom',
}

export default function CategorySheet({ open, onClose, onChoose, defaultCategory }) {
    return (
        <BottomSheet open={open} onClose={onClose} title="What kind of session was this?">
            <p className="sheet__copy">
                This day doesn't have a fixed category — choose the one that best describes it.
            </p>
            {PICKER_CATEGORIES.map((category) => (
                <button
                    key={category}
                    type="button"
                    className="sheet__action"
                    onClick={() => onChoose(category)}
                >
                    {CATEGORY_LABEL[category]}
                    {category === defaultCategory && (
                        <span className="badge badge-amber" style={{ marginLeft: 8 }}>Last time</span>
                    )}
                </button>
            ))}
        </BottomSheet>
    )
}
