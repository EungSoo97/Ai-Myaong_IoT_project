const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  getDashboard: () => request('/api/robot/dashboard'),
  getStatus: () => request('/api/robot/status'),
  getStreamUrl: () => request('/api/stream/url'),
  moveRobot: (command) => request('/api/robot/move', {
    method: 'POST',
    body: JSON.stringify({ command }),
  }),
  moveCamera: (direction) => request('/api/robot/camera', {
    method: 'POST',
    body: JSON.stringify({ direction }),
  }),
  dispenserFeed: (amount = 1) => request('/api/dispenser/feed', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  }),
  dispenserWater: (amount = 1) => request('/api/dispenser/water', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  }),
}
