class Reporter {
    constructor() {
        this.colors = {
            error: ('\x1b[31m'),
            warn: ('\x1b[33m'),
            info: ('\x1b[90m'),
            success: ('\x1b[32m'),
            debug: ('\x1b[36m'),
            event: ('\x1b[35m'),
            default: ('\x1b[37m'),
            reset: ('\x1b[0m')
        }
    }
    timestamp() {
        // Generate timestamp with format:
        // YYYY-MM-DD HH:mm:ss
        const dateStamp = new Date();
        const year = dateStamp.getFullYear();
        const month = String(dateStamp.getMonth() + 1).padStart(2, '0');
        const day = String(dateStamp.getDate()).padStart(2, '0');
        const hours = String(dateStamp.getHours()).padStart(2, '0');
        const minutes = String(dateStamp.getMinutes()).padStart(2, '0');
        const seconds = String(dateStamp.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    post(type, event, data) {
        const colors = this.colors;
        const s = this.timestamp();
        const t = type.charAt(0).toUpperCase();
        const e = event.padEnd(24, ' ');
        const sc = (`${colors['info']}${s}${colors['reset']}`);
        const tc = (`${colors[type]}${t}${colors['reset']}`);
        const ec = (`${colors['event']}${e}${colors['reset']}`);
        console.log(`[${sc}] [${tc}] ${ec} ${data}`);
    }
    success(event, data) {
        this.post('success', event, data);
    }
    error(event, data) {
        this.post('error', event, data);
    }
    warn(event, data) {
        this.post('warn', event, data);
    }
    info(event, data) {
        this.post('info', event, data);
    }
    debug(event, data) {
        this.post('debug', event, data);
    }
}

export default new Reporter();
