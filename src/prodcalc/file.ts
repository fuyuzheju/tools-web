import type { ProjectData } from "./store";

export const saveData = async (data: ProjectData, suggestedName: string) => {
    const jsonString = JSON.stringify(data, null, 2);

    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: suggestedName,
                types: [
                    {
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            };
            // @ts-expect-error: new API that typescript does not recognize
            const fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            return;
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.warn('File System Access API failed, falling back to download.', err);
        }
    }

    // fallback
    let fileName = prompt('请输入文件名', suggestedName);
    if (!fileName) return; // 用户点击取消
    if (!fileName.endsWith('.json')) fileName += '.json';

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}