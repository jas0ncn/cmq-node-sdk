"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Common = void 0;
const crypto_1 = require("crypto");
const got_1 = require("got");
/**
 * 公共处理类
 */
class Common {
    /**
     * 公共配置初始化
     * @param instance
     * @param options
     * @param type
     */
    constructor(instance, options, type) {
        this.instance = instance;
        this.options = options;
        this.type = type;
        /**
         * 请求方式
         */
        this.method = 'POST';
        options.SignatureMethod = instance.signatureMethod;
        options.SecretId = instance.secretId;
        options.Region = instance.region;
        // 指定了 endpoint 优先用指定的
        if (instance.useTDMQ) {
            if (instance.extranet) {
                this.protocol = 'https://';
                this.uri = `cmq-${options.Region}.public.tencenttdmq.com`;
            }
            else {
                this.protocol = 'http://';
                this.uri = `${options.Region}.mqadapter.cmq.tencentyun.com`;
            }
        }
        else if (instance.extranet) {
            this.protocol = 'https://';
            this.uri = `cmq-${type}-${options.Region}.api.qcloud.com`;
        }
        else {
            this.protocol = 'http://';
            this.uri = `cmq-${type}-${options.Region}.api.tencentyun.com`;
        }
        this.path = instance.path;
    }
    /**
     * 获取请求部分签名参数
     */
    getSignRequest() {
        return this.method + this.uri + this.path;
    }
    /**
     * 生成参数
     */
    getArgs() {
        const args = {};
        const vars = this.options;
        for (const key in vars) {
            if (vars.hasOwnProperty(key)) {
                if (Array.isArray(vars[key])) {
                    for (const k in vars[key]) {
                        if (vars[key].hasOwnProperty(k)) {
                            args[key + '.' + k] = vars[key][k];
                        }
                    }
                }
                else {
                    args[key] = vars[key];
                }
            }
        }
        return args;
    }
    /**
     * 签名参数
     */
    getSignParams() {
        const operates = [];
        const args = this.getArgs();
        const keys = Object.keys(args).sort();
        for (const key of keys) {
            operates.push(key.replace(/\_/g, '.') + '=' + args[key]);
        }
        return this.getSignRequest() + '?' + operates.join('&');
    }
    /**
     * 生成签名
     */
    factorySignature(param) {
        let method;
        switch (this.instance.signatureMethod) {
            case 'HmacSHA1':
                method = 'sha1';
                break;
            case 'HmacSHA256':
                method = 'sha256';
                break;
        }
        const hmac = crypto_1.createHmac(method, this.instance.secretKey)
            .update(param)
            .digest();
        return Buffer
            .from(hmac)
            .toString('base64');
    }
    /**
     * 发起请求
     */
    send() {
        this.options.Nonce = Math.floor(Math.random() * 10000);
        this.options.Timestamp = Math.floor(new Date().getTime() / 1000);
        this.options.Signature = this.factorySignature(this.getSignParams());
        const args = this.getArgs();
        let timeout = 10000;
        if (args.pollingWaitSeconds) {
            timeout = args.pollingWaitSeconds * 1000 + 1000;
        }
        return got_1.default.post(this.protocol + this.uri + this.path, {
            form: args,
            timeout,
        }).json();
    }
}
exports.Common = Common;
