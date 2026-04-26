/**
 * Static layout mirror of HomePage (header, socket bar, files + chat columns) for the PIN lock screen.
 */
export function HomePageSkeleton() {
    return (
        <div className="home-skeleton" aria-hidden>
            <header className="home-skeleton__header">
                <div className="sk sk--title" />
                <div className="sk sk--icon" />
            </header>

            <div className="sk sk--socket" />

            <div className="layout">
                <section className="layout-section layout-section--files">
                    <div className="sk sk--section-label" />
                    <div className="panel home-skeleton__panel">
                        <div className="home-skeleton__upload-head">
                            <div className="sk sk--line sk--grow" />
                            <div className="sk sk--btn-s" />
                        </div>
                        <div className="sk sk--dropzone" />
                        <ul className="home-skeleton__file-list">
                            {[0, 1, 2, 3].map((i) => (
                                <li key={i} className="home-skeleton__file-row">
                                    <div className="sk sk--file-name" />
                                    <div className="home-skeleton__file-actions">
                                        <div className="sk sk--icon-s" />
                                        <div className="sk sk--icon-s" />
                                        <div className="sk sk--icon-s" />
                                    </div>
                                </li>
                            ))}
                            {[0, 1, 2, 3].map((i) => (
                                <li key={i} className="home-skeleton__file-row">
                                    <div className="sk sk--file-name" />
                                    <div className="home-skeleton__file-actions">
                                        <div className="sk sk--icon-s" />
                                        <div className="sk sk--icon-s" />
                                        <div className="sk sk--icon-s" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="layout-section layout-section--chat">
                    <div className="sk sk--section-label" />
                    <div className="panel panel-chat home-skeleton__panel home-skeleton__panel--chat">
                        <div className="sk sk--search" />
                        <div className="sk sk--chat-toolbar" />
                        <div className="home-skeleton__chat-log">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="sk sk--msg" />
                            ))}
                        </div>
                        <div className="home-skeleton__chat-log">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="sk sk--msg" />
                            ))}
                        </div>
                        <div className="home-skeleton__chat-form">
                            <div className="sk sk--chat-input" />
                            <div className="sk sk--send" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
