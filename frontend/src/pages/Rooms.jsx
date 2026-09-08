import { useState } from 'react'
import {
  createRoom,
  joinRoom,
  getRoomMembers,
  getRoomRequests,
  approveRoomRequest,
  rejectRoomRequest,
} from '../services/roomService'
import { useRoomContext } from '../context/RoomContext'
import './Rooms.css'

function Rooms() {
  const { rooms, setActiveRoom, refreshRooms, loading } = useRoomContext()

  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const [selectedRoom, setSelectedRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])

  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleCreateRoom(event) {
    event.preventDefault()

    if (!roomName.trim()) {
      setError('Oda adı boş bırakılamaz.')
      return
    }

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      await createRoom(roomName.trim())

      setRoomName('')
      setSuccess('Oda başarıyla oluşturuldu.')

      await refreshRooms()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleJoinRoom(event) {
    event.preventDefault()

    if (!joinCode.trim()) {
      setError('Katılım kodunu gir.')
      return
    }

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      await joinRoom(
        joinCode.trim().toUpperCase(),
      )

      setJoinCode('')
      setSuccess(
        'Odaya katılma isteği gönderildi.',
      )

      await refreshRooms()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSelectRoom(room) {
    setSelectedRoom(room)
    
    if (room.membership_status === 'APPROVED') {
      setActiveRoom(room)
    }

    setError('')
    setSuccess('')
    setMembers([])
    setRequests([])

    if (room.role !== 'ADMIN') {
      return
    }

    try {
      setActionLoading(true)

      const [roomMembers, roomRequests] =
        await Promise.all([
          getRoomMembers(room.id),
          getRoomRequests(room.id),
        ])

      setMembers(roomMembers)
      setRequests(roomRequests)
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApprove(membershipId) {
    if (!selectedRoom) {
      return
    }

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      await approveRoomRequest(
        selectedRoom.id,
        membershipId,
      )

      const [roomMembers, roomRequests] =
        await Promise.all([
          getRoomMembers(selectedRoom.id),
          getRoomRequests(selectedRoom.id),
        ])

      setMembers(roomMembers)
      setRequests(roomRequests)

      setSuccess(
        'Üyelik isteği onaylandı.',
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(membershipId) {
    if (!selectedRoom) {
      return
    }

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      await rejectRoomRequest(
        selectedRoom.id,
        membershipId,
      )

      const roomRequests =
        await getRoomRequests(
          selectedRoom.id,
        )

      setRequests(roomRequests)

      setSuccess(
        'Üyelik isteği reddedildi.',
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="rooms-loading">
        Yükleniyor...
      </main>
    )
  }

  return (
    <main className="rooms-page">

      <header className="rooms-header">
        <div>
          <h1>Odalar</h1>

          <p>
            Odalarını yönet ve ekip üyelerini takip et.
          </p>
        </div>
      </header>

      {error && (
        <div className="rooms-error">
          Hata: {error}
        </div>
      )}

      {success && (
        <div className="rooms-success">
          {success}
        </div>
      )}

      <div className="rooms-top-grid">

        <section className="rooms-card">
          <h2>Oda Oluştur</h2>

          <form
            className="rooms-form"
            onSubmit={handleCreateRoom}
          >
            <div className="rooms-form-group">
              <label htmlFor="room-name">
                Oda adı
              </label>

              <input
                id="room-name"
                type="text"
                value={roomName}
                onChange={(event) =>
                  setRoomName(event.target.value)
                }
                placeholder="Örneğin: Yazılım Ekibi"
              />
            </div>

            <button
              type="submit"
              className="rooms-button rooms-button-primary"
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Oluşturuluyor...'
                : 'Oda Oluştur'}
            </button>
          </form>
        </section>

        <section className="rooms-card">
          <h2>Odaya Katıl</h2>

          <form
            className="rooms-form"
            onSubmit={handleJoinRoom}
          >
            <div className="rooms-form-group">
              <label htmlFor="join-code">
                Katılım kodu
              </label>

              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value)
                }
                placeholder="Katılım kodunu gir"
              />
            </div>

            <button
              type="submit"
              className="rooms-button rooms-button-primary"
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Gönderiliyor...'
                : 'Katılma İsteği Gönder'}
            </button>
          </form>
        </section>

      </div>

      <section className="rooms-card">

        <div className="rooms-section-heading">
          <div>
            <h2>Odalarım</h2>

            <p>
              Sahip olduğun veya katıldığın odalar.
            </p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="rooms-empty">
            Henüz bir odan yok.
          </div>
        ) : (
          <div className="rooms-list">

            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={`room-item ${
                  selectedRoom?.id === room.id
                    ? 'room-item-active'
                    : ''
                }`}
                onClick={() =>
                  handleSelectRoom(room)
                }
              >
                <span className="room-item-main">
                  <strong>
                    {room.name}
                  </strong>

                  <span className="room-status">
                    {room.membership_status}
                  </span>
                </span>

                {room.role === 'ADMIN' && (
                  <span className="room-code">
                    Kod: {room.join_code}
                  </span>
                )}
              </button>
            ))}

          </div>
        )}

      </section>

      {selectedRoom && (
        <section className="rooms-card">

          <div className="rooms-section-heading">
            <div>
              <h2>
                {selectedRoom.name}
              </h2>

              {selectedRoom.role === 'ADMIN' && (
                <p>
                  Oda üyelerini ve bekleyen istekleri yönet.
                </p>
              )}
            </div>
          </div>

          {selectedRoom.role === 'ADMIN' && (
            <div className="room-management-grid">

              <div className="room-management-section">

                <h3>Üyeler</h3>

                {members.length === 0 ? (
                  <div className="rooms-empty">
                    Henüz onaylı üye yok.
                  </div>
                ) : (
                  <ul className="room-member-list">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="room-member"
                      >
                        <div>
                          <strong>
                            {member.full_name}
                          </strong>

                          <span>
                            {member.email}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

              </div>

              <div className="room-management-section">

                <h3>Bekleyen İstekler</h3>

                {requests.length === 0 ? (
                  <div className="rooms-empty">
                    Bekleyen üyelik isteği yok.
                  </div>
                ) : (
                  <ul className="room-request-list">

                    {requests.map((request) => (
                      <li
                        key={request.id}
                        className="room-request"
                      >

                        <div className="room-request-user">
                          <strong>
                            {request.full_name}
                          </strong>

                          <span>
                            {request.email}
                          </span>
                        </div>

                        <div className="room-request-actions">

                          <button
                            type="button"
                            className="rooms-button rooms-button-primary"
                            onClick={() =>
                              handleApprove(
                                request.id,
                              )
                            }
                            disabled={actionLoading}
                          >
                            Onayla
                          </button>

                          <button
                            type="button"
                            className="rooms-button rooms-button-danger"
                            onClick={() =>
                              handleReject(
                                request.id,
                              )
                            }
                            disabled={actionLoading}
                          >
                            Reddet
                          </button>

                        </div>

                      </li>
                    ))}

                  </ul>
                )}

              </div>

            </div>
          )}

          {selectedRoom.role === 'USER' && (
            <div className="room-user-status">
              <span>Durum</span>

              <strong>
                {selectedRoom.membership_status}
              </strong>
            </div>
          )}

        </section>
      )}

    </main>
  )
}

export default Rooms