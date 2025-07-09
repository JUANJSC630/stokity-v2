export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-white shadow-sm">
                <img src="/stokity-icon.png" alt="Stokity Logo" className="h-6 w-6" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">Stokity</span>
            </div>
        </>
    );
}
