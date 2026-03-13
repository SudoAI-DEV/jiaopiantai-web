export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E1]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[#FDD835]/30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#FDD835] border-t-transparent animate-spin"></div>
        </div>
        <p className="text-[#4E342E] font-medium">加载中...</p>
      </div>
    </div>
  );
}
