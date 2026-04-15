type Props = {
    message: string;
};

export function FileToast({ message }: Props) {
    return (
        <div className="app-toast" role="status">
            {message}
        </div>
    );
}
