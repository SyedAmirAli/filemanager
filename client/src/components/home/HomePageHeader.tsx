import { Fragment, useState } from 'react';
import { CogIcon } from 'lucide-react';
import { ServerUrlSettingsModal } from './ServerUrlSettingsModal';

type Props = {
    onServerUrlChanged: () => void;
};

export function HomePageHeader({ onServerUrlChanged }: Props) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsMountKey, setSettingsMountKey] = useState(0);

    return (
        <Fragment>
            <header className="flex justify-between items-center px-3 sm:px-0">
                <h1 className="text-center">Shared files & chat</h1>
                <div>
                    <button
                        type="button"
                        aria-label="Server URL settings"
                        className="bg-slate-800 duration-500 hover:bg-slate-700 cursor-pointer p-2 rounded-md"
                        onClick={() => {
                            setSettingsMountKey((k) => k + 1);
                            setSettingsOpen(true);
                        }}
                    >
                        <CogIcon size={20} />
                    </button>
                </div>
            </header>
            <ServerUrlSettingsModal
                key={settingsMountKey}
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onApplied={onServerUrlChanged}
            />
        </Fragment>
    );
}
