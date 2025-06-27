export interface Props {

}

export type CompressResultType = 'blob' | 'file' | 'base64' | 'arrayBuffer'

export type CompressResult<T extends CompressResultType>
  = T extends 'blob' ? Blob
    : T extends 'file' ? File
      : T extends 'base64' ? string
        : T extends 'arrayBuffer' ? ArrayBuffer
          : never
