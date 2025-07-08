export default function loading() {
    return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white p-4">
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i}
          className={`
            bg-gradient-to-br from-blue-500 to-blue-300
            transition-all duration-500 ease-in-out
              rounded-full p-2 animate-pendulum
          `}
          style={{ 
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
    </div>
    </>
  );
}