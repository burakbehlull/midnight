const EmptyState = ({ icon, title, description }) => {
  return (
    <div className="glass rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-2 gradient-text">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

export default EmptyState
