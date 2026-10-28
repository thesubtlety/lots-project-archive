import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {matches,toCSV} from '../src/catalog.mjs';
// Exercise the actual browser controller with a small DOM double. This is not visual QA.
test('dataset filtering and record dialogs preserve origin, dates, and source URLs', () => {
  const html = readFileSync('dist/index.html','utf8');
  const records = JSON.parse(html.match(/<script id="record-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const element = () => ({hidden:false,value:'',textContent:'',children:[],dataset:{},handlers:{},
    addEventListener(type,fn){this.handlers[type]=fn},
    setAttribute(name,value){this[name]=value},
    replaceChildren(...children){this.children=children},
    append(...children){this.children.push(...children)},
    focus(){},scrollIntoView(){}});
  const ids = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1],element()]));
  ids['record-data'].textContent = JSON.stringify(records);
  ids.rows.children = records.map(record => Object.assign(element(),{dataset:{domain:record.domain}}));
  ids.provider.options = [{value:''},...new Set(records.map(r => r.provider))].map(v => typeof v === 'string' ? {value:v} : v);
  for(const id of ['sort','sort-provider']) { ids[id].parentElement=element(); ids[id].querySelector=()=>element(); }
  ids.detail.showModal = function(){this.open=true};
  ids.detail.close = function(){this.open=false;this.handlers.close()};
  const location = new URL('https://example.github.io/lots-archive/?origin=research');
  const document = {getElementById:id=>ids[id],querySelectorAll:()=>[],documentElement:element(),activeElement:{tagName:'BODY',focus(){}},handlers:{},addEventListener(type,fn){this.handlers[type]=fn},createElement:element,createTextNode:text=>({textContent:text})};
  const window = {handlers:{},addEventListener(type,fn){this.handlers[type]=fn}};
  const context = {matches,toCSV,document,window,location,URL,URLSearchParams,history:{replaceState(a,b,url){location.href=new URL(url,location).href}},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:false}),navigator:{},setTimeout};
  const source = readFileSync('src/app.js','utf8').replace(/^import .*?;\n/,'');
  vm.runInNewContext(source,context);
  const visible = () => ids.rows.children.filter(row=>!row.hidden);
  assert.equal(visible().length,9);
  ids.search.value='+c2';ids.search.handlers.input();assert.equal(visible().length,2);
  ids.reset.handlers.click();assert.equal(visible().length,184);
  ids.origin.value='archive';ids.origin.handlers.change();assert.equal(visible().length,175);
  location.hash=encodeURIComponent('*.supabase.co');window.handlers.hashchange();
  assert.equal(ids.detail.open,true);
  assert.equal(ids['research-detail'].hidden,false);
  assert.equal(ids['archive-note'].hidden,true);
  assert.ok(ids['detail-source'].textContent.includes('reviewed 2026-10-28'));
  assert.ok(ids['detail-basis'].textContent.includes('not an observed suffix IOC'));
  assert.equal(ids['archive-link'].href,'https://www.bitdefender.com/en-us/blog/businessinsights/apt36-nightmare-vibeware');
  ids.close.handlers.click();assert.equal(ids.detail.open,false);
  location.hash='github.com';window.handlers.hashchange();
  assert.equal(ids['research-detail'].hidden,true);
  assert.equal(ids['archive-note'].hidden,false);
  assert.ok(ids['archive-link'].href.startsWith('https://web.archive.org/'));
});
