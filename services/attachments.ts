import type { FileInfo } from '../types';

/** 단일 fileInfo / fileInfoList 병합 (읽기·저장 공통). */
export function mergeFileInfoList(
  item: { fileInfo?: FileInfo; fileInfoList?: FileInfo[] } | null | undefined
): FileInfo[] {
  if (item?.fileInfoList?.length) return [...item.fileInfoList];
  if (item?.fileInfo) return [item.fileInfo];
  return [];
}

/**
 * Firestore 저장 시 fileInfoList 로 통일하고 레거시 fileInfo 필드는 제거한다.
 * fileInfo/fileInfoList 가 없는 문서 타입은 그대로 반환한다.
 */
export function withNormalizedAttachments<T extends Record<string, unknown>>(item: T): T {
  if (!('fileInfo' in item) && !('fileInfoList' in item)) {
    return item;
  }
  const { fileInfo: _removed, ...rest } = item as T & { fileInfo?: FileInfo };
  const fileInfoList = mergeFileInfoList(item as { fileInfo?: FileInfo; fileInfoList?: FileInfo[] });
  return { ...rest, fileInfoList } as T;
}
