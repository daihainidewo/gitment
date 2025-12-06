const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// 在 before_post_render 阶段设置日期字符串，让 Hexo 的 Schema 自动转换为 Moment 对象
hexo.extend.filter.register('before_post_render', function(data) {
    if (data.source && data.layout === 'post') {
        const filePath = path.join(hexo.source_dir, data.source);
        
        try {
            if (!fs.existsSync(filePath)) {
                return data;
            }
            
            const stats = fs.statSync(filePath);
            
            // 辅助函数：将 Date 对象格式化为 Hexo 可识别的字符串格式 (YYYY-MM-DD HH:mm:ss)
            function formatDate(date) {
                if (!date) return null;
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
            
            // 辅助函数：检查日期是否有效（检查字符串、Date 对象或 Moment 对象）
            function isValidDate(value) {
                if (!value) return false;
                // 检查是否是 Moment 对象
                if (moment.isMoment(value)) {
                    return value.isValid();
                }
                // 检查是否是 Date 对象
                if (value instanceof Date) {
                    return !isNaN(value.getTime()) && value.getTime() !== new Date(0).getTime();
                }
                // 检查是否是字符串
                if (typeof value === 'string' && value.trim() !== '') {
                    const date = new Date(value);
                    return !isNaN(date.getTime()) && date.getTime() !== new Date(0).getTime();
                }
                return false;
            }
            
            // 只在 front-matter 中确实没有 date 或 date 无效时，才使用文件的创建时间
            if (!isValidDate(data.date)) {
                // 注意：在 Linux/Mac 上，birthtime 是创建时间
                // 在 Windows 上，birthtime 可能是修改时间
                const fileDate = stats.birthtime && stats.birthtime.getTime() > 0 
                    ? stats.birthtime 
                    : stats.ctime;
                // 设置为字符串格式，Hexo 的 Schema 会自动转换为 Moment 对象
                data.date = formatDate(fileDate);
            }
            
            // 对于 updated，我们总是使用文件的修改时间（如果文件更新了）
            // 但只在 front-matter 中没有 updated 或 updated 无效时，才设置
            if (!isValidDate(data.updated)) {
                data.updated = formatDate(stats.mtime);
            } else {
                // 如果 front-matter 中有 updated，但文件修改时间更新，则使用文件修改时间
                let existingUpdated;
                if (moment.isMoment(data.updated)) {
                    existingUpdated = data.updated.toDate();
                } else if (data.updated instanceof Date) {
                    existingUpdated = data.updated;
                } else if (typeof data.updated === 'string') {
                    existingUpdated = new Date(data.updated);
                } else {
                    existingUpdated = new Date(data.updated);
                }
                
                if (!isNaN(existingUpdated.getTime()) && stats.mtime > existingUpdated) {
                    data.updated = formatDate(stats.mtime);
                }
            }
        } catch (err) {
            // 如果文件不存在或读取失败，忽略错误
            hexo.log.warn(`Warning: Cannot read file stats for ${filePath}: ${err.message}`);
        }
    }
    
    return data;
});
