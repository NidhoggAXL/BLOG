import { getRsaPublicPem } from '../../utils/auth/keys'

export default defineEventHandler(() => {
  return {
    publicKey: getRsaPublicPem(),
  }
})
