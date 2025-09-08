/**
 * DQ Pixel - Sistema de rastreamento 1st-party
 * @version 1.0.0
 */
(function(window, document) {
  'use strict';
  
  // Configuração
  const COOKIE_NAME = '_dq_attrib';
  const COOKIE_DAYS = 90;
  const PIXEL_ENDPOINT = window.DQ_PIXEL_ENDPOINT || 'https://your-supabase-url.supabase.co/functions/v1/ingest-pixel';
  
  // Gerar ou recuperar visitor ID
  function getVisitorId() {
    let visitorId = getCookie('_dq_visitor');
    if (!visitorId) {
      visitorId = generateUUID();
      setCookie('_dq_visitor', visitorId, 365);
    }
    return visitorId;
  }
  
  // Gerar UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Gerenciamento de cookies
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
  }
  
  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }
  
  // Parse de parâmetros da URL
  function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const attribution = {};
    
    // UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      const value = params.get(param);
      if (value) attribution[param] = value;
    });
    
    // Click IDs
    ['fbclid', 'gclid'].forEach(param => {
      const value = params.get(param);
      if (value) attribution[param] = value;
    });
    
    // Landing page
    attribution.landing_page = window.location.href.split('?')[0];
    attribution.timestamp = new Date().toISOString();
    
    return attribution;
  }
  
  // Salvar atribuição em cookie
  function saveAttribution() {
    const params = getURLParams();
    
    // Se não tem parâmetros de atribuição, não faz nada
    const hasAttribution = params.utm_source || params.utm_medium || 
                          params.utm_campaign || params.fbclid || params.gclid;
    
    if (!hasAttribution) {
      return;
    }
    
    // Recuperar atribuição existente
    let existingAttrib = getCookie(COOKIE_NAME);
    if (existingAttrib) {
      try {
        existingAttrib = JSON.parse(existingAttrib);
      } catch {
        existingAttrib = {};
      }
    } else {
      existingAttrib = {};
    }
    
    // Merge com novos parâmetros (novos sobrescrevem antigos)
    const newAttrib = Object.assign({}, existingAttrib, params);
    
    // Salvar cookie atualizado
    setCookie(COOKIE_NAME, JSON.stringify(newAttrib), COOKIE_DAYS);
    
    return newAttrib;
  }
  
  // Enviar dados para o servidor
  function sendPixel(additionalData = {}) {
    const visitorId = getVisitorId();
    const attribution = getCookie(COOKIE_NAME);
    
    let data = {
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar atribuição se existir
    if (attribution) {
      try {
        const attribData = JSON.parse(attribution);
        data = Object.assign(data, attribData);
      } catch {
        console.warn('[DQ Pixel] Erro ao parsear atribuição');
      }
    }
    
    // Merge com dados adicionais
    data = Object.assign(data, additionalData);
    
    // Enviar via fetch (não bloqueia)
    if (typeof fetch !== 'undefined') {
      fetch(PIXEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(err => {
        console.warn('[DQ Pixel] Erro ao enviar pixel:', err);
      });
    } else {
      // Fallback para navegadores antigos
      const img = new Image();
      img.src = PIXEL_ENDPOINT + '?' + encodeURIComponent(JSON.stringify(data));
    }
  }
  
  // API pública
  window.DQPixel = {
    // Inicializar pixel
    init: function(config) {
      if (config && config.endpoint) {
        window.DQ_PIXEL_ENDPOINT = config.endpoint;
      }
      
      // Salvar atribuição da URL atual
      const attribution = saveAttribution();
      
      // Enviar pixel de pageview
      sendPixel();
      
      console.log('[DQ Pixel] Inicializado', {
        visitor_id: getVisitorId(),
        attribution: attribution,
      });
    },
    
    // Adicionar email do usuário
    pushEmail: function(email) {
      if (!email || typeof email !== 'string') {
        console.warn('[DQ Pixel] Email inválido');
        return;
      }
      
      sendPixel({ email: email });
      console.log('[DQ Pixel] Email adicionado');
    },
    
    // Adicionar CPF do usuário
    pushCPF: function(cpf) {
      if (!cpf || typeof cpf !== 'string') {
        console.warn('[DQ Pixel] CPF inválido');
        return;
      }
      
      sendPixel({ cpf: cpf });
      console.log('[DQ Pixel] CPF adicionado');
    },
    
    // Enviar evento customizado
    track: function(eventName, data) {
      if (!eventName) {
        console.warn('[DQ Pixel] Nome do evento é obrigatório');
        return;
      }
      
      sendPixel(Object.assign({
        event: eventName,
      }, data || {}));
      
      console.log('[DQ Pixel] Evento rastreado:', eventName);
    },
    
    // Obter visitor ID
    getVisitorId: getVisitorId,
    
    // Obter atribuição atual
    getAttribution: function() {
      const attribution = getCookie(COOKIE_NAME);
      if (attribution) {
        try {
          return JSON.parse(attribution);
        } catch {
          return null;
        }
      }
      return null;
    },
    
    // Limpar dados (compliance LGPD)
    clearData: function() {
      document.cookie = COOKIE_NAME + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
      document.cookie = '_dq_visitor=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
      console.log('[DQ Pixel] Dados limpos');
    }
  };
  
  // Auto-inicializar se data-auto-init="true"
  const currentScript = document.currentScript;
  if (currentScript && currentScript.getAttribute('data-auto-init') === 'true') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        window.DQPixel.init();
      });
    } else {
      window.DQPixel.init();
    }
  }
  
})(window, document);