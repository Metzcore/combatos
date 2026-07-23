export function ProgramStatusPanel({ title, children, action, actionLabel = 'Retry' }) {
    return (
        <div className="library-state" role="status">
            <div className="library-state__title">{title}</div>
            {children && <div className="library-state__copy">{children}</div>}
            {action && (
                <button type="button" className="btn-secondary library-state__action" onClick={action}>
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export function ProgramNotice({ children, warning = false, action, actionLabel = 'Retry' }) {
    return (
        <div className={`library-notice${warning ? ' library-notice--warning' : ''}`} role="status">
            <span>{children}</span>
            {action && (
                <button type="button" onClick={action}>{actionLabel}</button>
            )}
        </div>
    )
}
