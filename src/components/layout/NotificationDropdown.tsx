import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

interface InviteNotification {
	id: string
	tenant_id: string
	role: string
	created_at: string
	token: string
}

export function NotificationDropdown() {
	const { t } = useTranslation()
	const { user } = useAuthStore()
	const [open, setOpen] = useState(false)
	const [invites, setInvites] = useState<InviteNotification[]>([])

	useEffect(() => {
		if (!user) return
		const load = async () => {
			try {
				const email = user.email
				if (!email) return
				const { data, error } = await supabase
					.from('team_invites')
					.select('id, tenant_id, role, created_at, invite_token')
					.eq('email', email)
					.eq('status', 'pendente')

				if (error) {
					console.warn('Erro ao carregar convites:', error.message)
					setInvites([])
					return
				}

				if (data) {
					const mappedData = data.map(invite => ({
						...invite,
						token: invite.invite_token
					}))
					setInvites(mappedData as InviteNotification[])
				}
			} catch (err) {
				console.error('Erro ao carregar notificações:', err)
				setInvites([])
			}
		}
		load()
	}, [user])

	return (
		<div className="relative">
			<button
				onClick={() => setOpen(o => !o)}
				className="relative px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-950 text-slate-700 dark:text-white text-sm transition-colors"
				aria-label={t('notifications.label')}
			>
				{t('notifications.button')}
				{invites.length > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
						{invites.length}
					</span>
				)}
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl p-4 z-50">
						<h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">
							{t('notifications.title')}
						</h4>

						{invites.length === 0 && (
							<p className="text-xs text-slate-500 dark:text-slate-500 py-2 text-center">
								{t('notifications.empty')}
							</p>
						)}

						<div className="space-y-2 max-h-64 overflow-auto custom-scrollbar">
							{invites.map(i => (
								<a
									key={i.id}
									href={`/join-team?token=${i.token}`}
									className="block p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-white text-sm transition-colors"
								>
									<p>
										{t('notifications.invitePrefix')} <strong className="text-emerald-600 dark:text-emerald-400">{i.role}</strong>
									</p>
									<div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
										{new Date(i.created_at).toLocaleString()}
									</div>
								</a>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	)
}