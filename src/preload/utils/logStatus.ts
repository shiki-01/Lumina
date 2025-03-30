import type { Status, APISchema } from '../types/index.js'

const statusSchema: { [key: string]: { [key: number]: { message: string } } } = {
  SUCCESS: {
    200: {
      message: 'Success'
    }
  },
  WARN: {
    300: {
      message: 'Warning'
    },
    301: {
      message: 'Redirect'
    },
    302: {
      message: 'Found'
    },
    304: {
      message: 'Not Modified'
    }
  },
  ERROR: {
    400: {
      message: 'Bad Request'
    },
    401: {
      message: 'Unauthorized'
    },
    403: {
      message: 'Forbidden'
    },
    404: {
      message: 'Not Found'
    },
    500: {
      message: 'Internal Server Error'
    }
  }
}

/**
 * ステータスをログに出力する
 * @param message ログに出力するメッセージ
 * @param status ログに出力するステータス ('SUCCESS' または 'ERROR')
 * @param error エラーが発生した場合のエラーオブジェクトまたはエラーメッセージ (オプション)
 */
const logStatus = <T extends object | unknown>(
  status: Status,
  message: T = {} as T,
  error?: unknown
): APISchema<T> => {
  const statusType = Object.keys(statusSchema).find((key) => statusSchema[key][status.code])

  let logMessage = status.message

  if (!logMessage) {
    if (statusType) {
      logMessage = statusSchema[statusType][status.code].message
    } else {
      logMessage = statusType === 'SUCCESS' ? 'Success' : 'Internal Server Error'
    }
  }

  if (statusType === 'SUCCESS') {
    console.log(`[SUCCESS] ${logMessage}`)
    return { status: { code: status.code, message: logMessage }, data: message }
  } else if (statusType === 'ERROR') {
    console.error(`[ERROR] ${logMessage}`)
    if (error) {
      const errorMessage = error instanceof Error ? error.message : error
      console.error(`  └─ ${errorMessage}`)
      return { status, error: errorMessage }
    }
    return { status, error: logMessage }
  } else if (statusType === 'WARN') {
    console.warn(`[WARN] ${logMessage}`)
    return { status, data: message }
  } else {
    console.error(`[ERROR] Invalid status code: ${status.code}`)
    return { status, error: 'Internal Server Error' }
  }
}

export { logStatus }
