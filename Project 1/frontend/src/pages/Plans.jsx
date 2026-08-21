import { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { subscriptionService } from '../services/subscriptionService'

import { useAuth } from '../contexts/AuthContext'

import { mapSubscription, statusLabel } from '../utils/subscription'

import './Subscription.css'



const formatDate = (value) => {

  if (!value) return '—'

  try {

    return new Date(value).toLocaleDateString('en-IN', {

      day: 'numeric',

      month: 'short',

      year: 'numeric',

    })

  } catch {

    return '—'

  }

}



const formatInr = (amount) => {

  if (amount == null || Number.isNaN(Number(amount))) return '—'

  return `₹${Number(amount).toLocaleString('en-IN')}`

}



const loadRazorpayScript = () =>

  new Promise((resolve) => {

    if (window.Razorpay) return resolve(true)

    const script = document.createElement('script')

    script.src = 'https://checkout.razorpay.com/v1/checkout.js'

    script.onload = () => resolve(!!window.Razorpay)

    script.onerror = () => resolve(false)

    document.body.appendChild(script)

  })



const Plans = () => {

  const { isAuthenticated, refreshSubscription } = useAuth()

  const navigate = useNavigate()

  const [sub, setSub] = useState(null)

  const [pricing, setPricing] = useState(null)

  const [loading, setLoading] = useState(true)

  const [busy, setBusy] = useState('')

  const [error, setError] = useState('')

  const [showActivePlanModal, setShowActivePlanModal] = useState(false)



  const load = async () => {

    setError('')

    setLoading(true)

    try {

      const priceData = await subscriptionService.getPricing()

      setPricing({

        trialDays: priceData.trialDays ?? priceData.TrialDays ?? 14,

        monthlyPriceInr: priceData.monthlyPriceInr ?? priceData.MonthlyPriceInr ?? 499,

        yearlyPriceInr: priceData.yearlyPriceInr ?? priceData.YearlyPriceInr ?? 4999,

        razorpayConfigured: priceData.razorpayConfigured ?? priceData.RazorpayConfigured ?? false,

      })



      if (isAuthenticated) {

        const data = await subscriptionService.getMine()

        setSub(mapSubscription({ subscription: data }))

      } else {

        setSub(null)

      }

    } catch (err) {

      setError(err.response?.data?.message || 'Could not load plans.')

    } finally {

      setLoading(false)

    }

  }



  useEffect(() => {

    load()

  }, [isAuthenticated])



  const blockIfActivePlan = () => {

    if (sub?.hasAccess) {

      setShowActivePlanModal(true)

      return true

    }

    return false

  }



  const startTrial = async () => {

    if (!isAuthenticated) {

      navigate('/register')

      return

    }

    if (blockIfActivePlan()) return



    setBusy('Trial')

    setError('')

    try {

      const data = await subscriptionService.startTrial()

      const next = mapSubscription({ subscription: data })

      setSub(next)

      refreshSubscription(next)

      navigate('/')

    } catch (err) {

      setError(err.response?.data?.message || 'Could not start trial.')

    } finally {

      setBusy('')

    }

  }



  const payForPlan = async (plan) => {

    if (!isAuthenticated) {

      navigate('/login')

      return

    }

    if (blockIfActivePlan()) return



    setBusy(plan)

    setError('')

    try {

      const ok = await loadRazorpayScript()

      if (!ok) throw new Error('Could not load Razorpay checkout.')



      const order = await subscriptionService.createRazorpayOrder(plan)

      const keyId = order.keyId || order.KeyId

      const orderId = order.orderId || order.OrderId

      const amountPaise = order.amountPaise ?? order.AmountPaise

      const currency = order.currency || order.Currency || 'INR'



      await new Promise((resolve, reject) => {

        const rzp = new window.Razorpay({

          key: keyId,

          amount: amountPaise,

          currency,

          name: 'Inventory Management',

          description: `${plan} subscription`,

          order_id: orderId,

          handler: async (response) => {

            try {

              const data = await subscriptionService.verifyRazorpayPayment({

                razorpayOrderId: response.razorpay_order_id,

                razorpayPaymentId: response.razorpay_payment_id,

                razorpaySignature: response.razorpay_signature,

              })

              const next = mapSubscription({ subscription: data })

              setSub(next)

              refreshSubscription(next)

              resolve()

              navigate('/')

            } catch (verifyErr) {

              reject(verifyErr)

            }

          },

          modal: {

            ondismiss: () => reject(new Error('Payment cancelled.')),

          },

        })

        rzp.on('payment.failed', () => reject(new Error('Payment failed. Try again.')))

        rzp.open()

      })

    } catch (err) {

      setError(err.response?.data?.message || err.message || 'Could not complete payment.')

    } finally {

      setBusy('')

    }

  }



  const showTrial = !isAuthenticated || (sub && !sub.hasUsedTrial && !sub.hasAccess)



  const plans = [

    ...(showTrial

      ? [

          {

            id: 'Trial',

            name: 'Trial',

            length: `${pricing?.trialDays ?? 14} days`,

            price: 'Free once',

            detail: 'One free trial per email. Tap Get to unlock the shop for 14 days.',

          },

        ]

      : []),

    {

      id: 'Monthly',

      name: 'Monthly',

      length: '1 calendar month',

      price: formatInr(pricing?.monthlyPriceInr),

      detail: 'Pay online to unlock or renew for one month.',

    },

    {

      id: 'Yearly',

      name: 'Yearly',

      length: '1 calendar year',

      price: formatInr(pricing?.yearlyPriceInr),

      detail: 'Pay online to unlock or renew for one year.',

    },

  ]



  return (

    <div className="subscription page">

      <header className="subscription-hero">

        <p className="subscription-kicker">Plans</p>

        <h1>Choose how you run the shop</h1>

        <p className="page-subtitle">

          New accounts can Get a 14-day Trial. After that, only Monthly or Yearly with payment.

        </p>

      </header>



      {error ? <div className="error-message">{error}</div> : null}



      {isAuthenticated ? (

        <section className="card subscription-current">

          {loading || !sub ? (

            <p className="subscription-muted">Loading plan…</p>

          ) : (

            <>

              <div>

                <span className="subscription-label">Current plan</span>

                <strong>{sub.plan === 'None' ? 'No plan' : sub.plan}</strong>

              </div>

              <div>

                <span className="subscription-label">Status</span>

                <span className={`subscription-badge is-${(sub.status || '').toLowerCase()}`}>

                  {statusLabel(sub.status)}

                </span>

              </div>

              <div>

                <span className="subscription-label">Days left</span>

                <strong>{sub.hasAccess ? sub.daysLeft : 0}</strong>

              </div>

              <div>

                <span className="subscription-label">Ends on</span>

                <strong>{formatDate(sub.expiresAt)}</strong>

              </div>

            </>

          )}

        </section>

      ) : null}



      {isAuthenticated && !sub?.hasAccess && !loading ? (

        <p className="subscription-lock-note">

          {sub?.hasUsedTrial

            ? 'Trial is over. Choose Monthly or Yearly to unlock shop tools.'

            : 'Shop tools stay locked until you Get Trial or pay for a plan.'}

        </p>

      ) : null}



      {!isAuthenticated ? (

        <p className="subscription-lock-note">

          <Link to="/register">Register</Link> or <Link to="/login">Login</Link>, then choose a plan here.

        </p>

      ) : null}



      <section className="subscription-plans">

        {plans.map((plan) => {

          const isTrial = plan.id === 'Trial'



          let actionLabel = 'Pay & unlock'

          let disabled = !!busy || loading

          let onClick = () => payForPlan(plan.id)



          if (isTrial) {

            if (!isAuthenticated) {

              actionLabel = 'Get'

              onClick = () => navigate('/register')

              disabled = false

            } else {

              actionLabel = busy === 'Trial' ? 'Starting…' : 'Get'

              onClick = startTrial

            }

          } else if (!isAuthenticated) {

            actionLabel = 'Login to pay'

            onClick = () => navigate('/login')

            disabled = false

          } else if (busy === plan.id) {

            actionLabel = 'Opening…'

          }



          return (

            <article key={plan.id} className="card subscription-plan">

              <h2>{plan.name}</h2>

              <p className="subscription-length">{plan.length}</p>

              <p className="subscription-price">{plan.price}</p>

              <p>{plan.detail}</p>

              <button

                type="button"

                className="btn btn-primary"

                disabled={disabled}

                onClick={onClick}

              >

                {actionLabel}

              </button>

            </article>

          )

        })}

      </section>



      {showActivePlanModal ? (

        <div

          className="modal-overlay"

          onClick={() => setShowActivePlanModal(false)}

          role="presentation"

        >

          <div

            className="modal-box"

            onClick={(e) => e.stopPropagation()}

            role="dialog"

            aria-modal="true"

            aria-labelledby="active-plan-modal-title"

          >

            <h3 id="active-plan-modal-title">Plan already active</h3>

            <p className="modal-hint">

              A plan is already active. You cannot take another plan until the current one ends.

            </p>

            <div className="modal-actions">

              <button

                type="button"

                className="btn btn-primary"

                onClick={() => setShowActivePlanModal(false)}

              >

                OK

              </button>

            </div>

          </div>

        </div>

      ) : null}

    </div>

  )

}



export default Plans

