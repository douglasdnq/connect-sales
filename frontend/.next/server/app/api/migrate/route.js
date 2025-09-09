(()=>{var a={};a.id=721,a.ids=[721],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:a=>{"use strict";a.exports=require("punycode")},15748:(a,b,c)=>{"use strict";c.d(b,{N:()=>d});let d=(0,c(17572).UU)("https://camdhrxwfqkxamdxyviv.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbWRocnh3ZnFreGFtZHh5dml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Nzk3MTIsImV4cCI6MjA3MjM1NTcxMn0.NtGdZqfHYHUCjAmOrtrxD4a4pb2riyhjAbQ26aGa-n0")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},24442:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>H,patchFetch:()=>G,routeModule:()=>C,serverHooks:()=>F,workAsyncStorage:()=>D,workUnitAsyncStorage:()=>E});var d={};c.r(d),c.d(d,{GET:()=>B,POST:()=>A});var e=c(10018),f=c(6971),g=c(28218),h=c(92348),i=c(63138),j=c(261),k=c(21652),l=c(29246),m=c(41590),n=c(59301),o=c(85107),p=c(47113),q=c(86015),r=c(4280),s=c(86439),t=c(61862),u=c(94179),v=c(15748);let w=`
-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    full_name TEXT,
    whatsapp TEXT,
    email TEXT,
    age INTEGER,
    education TEXT,
    
    -- Professional Info  
    work_situation TEXT,
    happy_with_work TEXT,
    salary_range TEXT,
    
    -- Study Info
    fiscal_study_moment TEXT,
    study_time_dedication TEXT,
    why_mentoria_ideal TEXT,
    why_deserve_spot TEXT,
    investment_type TEXT,
    priority_start TEXT,
    
    -- Scoring
    score INTEGER,
    
    -- Form Meta
    form_id TEXT,
    form_date TIMESTAMPTZ,
    
    -- UTM Tracking
    utm_source TEXT,
    utm_medium TEXT,  
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    gclid TEXT,
    fbclid TEXT,
    
    -- Lead Status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    lead_source TEXT DEFAULT 'respondi',
    
    -- Conversion tracking
    converted_to_customer_id UUID,
    converted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`,x=`
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp); 
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_form_date ON leads(form_date);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
`,y=`
-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`,z=`
-- Enable RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON leads;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON leads
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON leads TO anon, authenticated, service_role;
`;async function A(a){try{console.log("Running migration for leads table...");let{error:a}=await v.N.rpc("exec_sql",{sql:w});if(a){console.error("Error creating table:",a);let{error:b}=await v.N.from("_temp_migration").select("*").limit(1);return console.log("Attempting to create table via raw SQL..."),u.NextResponse.json({error:"Migration failed - need to run manually",sql:w,message:"Please run this SQL in Supabase SQL Editor"})}let{error:b}=await v.N.rpc("exec_sql",{sql:x});b&&console.error("Error creating indexes:",b);let{error:c}=await v.N.rpc("exec_sql",{sql:y});c&&console.error("Error creating trigger:",c);let{error:d}=await v.N.rpc("exec_sql",{sql:z});return d&&console.error("Error creating RLS:",d),u.NextResponse.json({success:!0,message:"Leads table migration completed successfully"})}catch(a){return console.error("Migration error:",a),u.NextResponse.json({error:"Migration failed",details:a,message:"Please run the migration SQL manually in Supabase"},{status:500})}}async function B(){return u.NextResponse.json({message:"Run this SQL in Supabase SQL Editor to create the leads table:",sql:w+"\n\n"+x+"\n\n"+y+"\n\n"+z})}let C=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/migrate/route",pathname:"/api/migrate",filename:"route",bundlePath:"app/api/migrate/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/douglas/racing-lucas/frontend/src/app/api/migrate/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:D,workUnitAsyncStorage:E,serverHooks:F}=C;function G(){return(0,g.patchFetch)({workAsyncStorage:D,workUnitAsyncStorage:E})}async function H(a,b,c){var d;let e="/api/migrate/route";"/index"===e&&(e="/");let g=await C.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||C.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===C.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>C.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>C.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await C.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await C.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(L||b instanceof s.NoFallbackError||await C.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},27910:a=>{"use strict";a.exports=require("stream")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},41327:()=>{},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},49575:()=>{},55591:a=>{"use strict";a.exports=require("https")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:a=>{"use strict";a.exports=require("zlib")},79551:a=>{"use strict";a.exports=require("url")},81630:a=>{"use strict";a.exports=require("http")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[708,532,572],()=>b(b.s=24442));module.exports=c})();