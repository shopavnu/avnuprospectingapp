declare module 'papaparse' {
  export interface ParseMeta {
    delimiter?: string
    linebreak?: string
    aborted?: boolean
    truncated?: boolean
    cursor?: number
    fields?: string[]
  }

  export interface ParseError {
    type: string
    code: string
    message: string
    row?: number
  }

  export interface ParseResult<T> {
    data: T[]
    errors: ParseError[]
    meta: ParseMeta
  }

  export interface ParseConfig<T = any> {
    delimiter?: string
    header?: boolean
    dynamicTyping?: boolean | { [field: string]: boolean }
    preview?: number
    encoding?: string
    worker?: boolean
    comments?: boolean | string
    step?: (results: ParseResult<T>, parser: any) => void
    complete?: (results: ParseResult<T>) => void
    error?: (error: any) => void
    download?: boolean
    skipEmptyLines?: boolean | 'greedy'
    fastMode?: boolean
    withCredentials?: boolean
    transformHeader?: (h: string) => string
    transform?: (value: any, field: string | number) => any
  }

  export function parse<T = any>(input: string | File | Blob, config?: ParseConfig<T>): ParseResult<T>
}
