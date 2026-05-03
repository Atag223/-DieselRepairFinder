'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  providerId: string
  isActive: boolean
  isSuspended: boolean
  isDeleted: boolean
  isPending: boolean
}

export default function AdminProviderActions({ providerId, isActive, isSuspended, isDeleted, isPending }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [actionError, setActionError] = useState('')

  async function handleApprove() {
    setLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? 'Failed to approve provider')
        return
      }
      router.refresh()
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSuspend() {
    setLoading(true)
    try {
      await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend', reason: suspendReason }),
      })
      setShowSuspendModal(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleReactivate() {
    setLoading(true)
    try {
      await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await fetch(`/api/admin/providers/${providerId}`, { method: 'DELETE' })
      setShowDeleteModal(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href={`/admin/providers/${providerId}/edit`}
          className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        >
          Edit
        </a>

        {actionError && (
          <span className="text-xs text-red-400">{actionError}</span>
        )}

        {isDeleted ? (
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-green-900/60 hover:bg-green-800 text-green-300 transition-colors disabled:opacity-50"
          >
            Restore
          </button>
        ) : isActive ? (
          <button
            onClick={() => setShowSuspendModal(true)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-yellow-900/60 hover:bg-yellow-800 text-yellow-300 transition-colors disabled:opacity-50"
          >
            Suspend
          </button>
        ) : isSuspended ? (
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-green-900/60 hover:bg-green-800 text-green-300 transition-colors disabled:opacity-50"
          >
            Reactivate
          </button>
        ) : isPending ? (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-green-900/60 hover:bg-green-800 text-green-300 transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}

        {!isDeleted && (
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>

      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Suspend Provider</h3>
            <p className="text-gray-400 text-sm mb-4">
              This provider will no longer appear publicly. You can reactivate them later.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (optional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading}
                className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Suspending…' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-red-400">Delete Provider</h3>
            <p className="text-gray-400 text-sm mb-6">
              The provider will be soft-deleted (hidden from public) and can be restored later.
              Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
