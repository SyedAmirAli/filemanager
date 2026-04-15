import type { SocketStatus } from './types';

type Props = {
    socketStatus: SocketStatus;
    socketErr: string | null;
};

export function SocketBanner({ socketStatus, socketErr }: Props) {
    if (socketStatus === 'connected') return null;

    return (
        <div
            className={`socket-banner${socketStatus === 'connecting' ? ' socket-banner--pending' : ''}`}
            role="alert"
        >
            {socketStatus === 'connecting' ? (
                <p>Connecting to the server…</p>
            ) : (
                <>
                    <p>
                        <strong>Not connected.</strong> Chat and live file updates will not work until the connection
                        is restored. Make sure the API is running (e.g. port 5180) and reload if needed.
                    </p>
                    {socketErr && <p className="socket-banner-detail">{socketErr}</p>}
                </>
            )}
        </div>
    );
}
