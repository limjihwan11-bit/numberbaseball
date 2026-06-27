import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

class MatchMediaMock {
  matches = false
  media = ''
  onchange = null
  addListener() {}
  removeListener() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => new MatchMediaMock()
})
