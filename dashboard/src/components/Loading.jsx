const Loading = ({ message = 'Yükleniyor...' }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  )
}

export default Loading
