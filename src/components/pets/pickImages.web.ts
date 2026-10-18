// 웹: 파일 선택 창으로 사진을 고른다. 고른 사진은 브라우저 메모리 주소(blob:)로만 쓰고 서버에 올리지 않는다.
export function pickImages(maxCount: number): Promise<{ uri: string }[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []).slice(0, maxCount);
      resolve(files.map((file) => ({ uri: URL.createObjectURL(file) })));
    };
    input.click();
  });
}
