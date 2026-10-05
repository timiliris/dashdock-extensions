/* Config-only RPC. The parent binds every request to this widget's identity. */
(() => {
  const pending = new Map(); let sequence = 0, preview = false;
  function request(method,params={}) {
    return new Promise((resolve,reject)=>{
      const requestId=`config-${++sequence}`;
      const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('request_timeout'));},15000);
      pending.set(requestId,{resolve,reject,timer});
      parent.postMessage({type:'dashdock:request',requestId,method,params},'*');
    });
  }
  addEventListener('message',event=>{
    if(event.source!==parent || !event.data) return;
    const message=event.data;
    if(message.type==='dashdock:context') {preview=message.preview===true;document.dispatchEvent(new Event('dashdock:storage-context'));}
    if(message.type!=='dashdock:response') return;
    const item=pending.get(message.requestId);if(!item) return;
    pending.delete(message.requestId);clearTimeout(item.timer);
    if(message.error) item.reject(new Error(message.error));else item.resolve(message.result);
  });
  window.WidgetStore={get:()=>request('config.get'),save:config=>request('config.save',{config}),preview:()=>preview};
})();
