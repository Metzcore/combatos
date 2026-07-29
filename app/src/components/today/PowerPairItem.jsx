/**
 * components/today/PowerPairItem.jsx — A7b PAP/pair header (corrective plan
 * §4). Named "MAIN" / "POWER" rather than the first attempt's anonymous
 * "PAP 1/2" rows, so a set of paired inputs always reads which lift is
 * which. Renders nothing when `pair` is null/absent — most items have none.
 */
export default function PowerPairItem({ mainName, pair }) {
    if (!pair || !pair.name) return null
    const dose = [pair.sets, pair.reps].filter((v) => v != null).join(' × ')

    return (
        <div className="pap-pair-row">
            <div className="pap-pair-row__line">
                <span className="pap-pair-row__tag">MAIN</span> {mainName}
            </div>
            <div className="pap-pair-row__line">
                <span className="pap-pair-row__tag pap-pair-row__tag--power">POWER</span> {pair.name}
                {dose && <span className="pap-pair-row__dose"> ({dose})</span>}
            </div>
            {pair.note && <div className="pap-pair-row__note">{pair.note}</div>}
        </div>
    )
}
