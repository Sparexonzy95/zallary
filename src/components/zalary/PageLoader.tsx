import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LOGO_SVG = '/assets/landing/svg_zalary_damrtk.svg'

export function PageLoader() {
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(15)

  useEffect(() => {
    let value = 15
    let finished = false

    const timer = setInterval(() => {
      if (finished) return
      value += 6
      if (value > 90) value = 90
      setProgress(value)
    }, 100)

    const finish = () => {
      finished = true
      clearInterval(timer)
      setProgress(100)
      setTimeout(() => setVisible(false), 350)
    }

    const t = setTimeout(finish, 600)

    return () => {
      clearInterval(timer)
      clearTimeout(t)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#080808',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: '0 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
            }}
          >
            {/* Logo */}
            <motion.img
              src={LOGO_SVG}
              alt="Zalary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                width: '100%',
                maxWidth: '240px',
                maxHeight: '64px',
                objectFit: 'contain',
              }}
            />

            {/* Loader Bar */}
            <div
              style={{
                width: 'min(260px,72vw)',
                height: '4px',
                background: '#222222',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: '#FE9E15',
                  borderRadius: '999px',
                }}
              />
            </div>

            {/* Percent */}
            <span
              style={{
                fontSize: 11,
                letterSpacing: '2px',
                fontWeight: 600,
                color: '#FE9E15',
                fontFamily: 'Fira Mono, monospace',
              }}
            >
              {Math.floor(progress)}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
