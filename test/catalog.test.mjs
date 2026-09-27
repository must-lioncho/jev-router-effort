import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  startCodexProxy,
  codexModels,
  effortForModel,
  jevDecisionEvents,
  addJevModel,
  CODEX_AUTO_EFFORT,
} from '../src/codex-proxy.mjs';
import { codexArgs } from '../src/codex-cli.mjs';

test('Codex launcher defaults Jev Router effort to auto', () => {
  const automatic = codexArgs('http://127.0.0.1:1234', []);
  assert.ok(automatic.includes('model_reasoning_effort="auto"'));
  const concrete = codexArgs('http://127.0.0.1:1234', ['--model', 'gpt-6-sol']);
  assert.ok(!concrete.includes('model_reasoning_effort="auto"'));
});

test('Jev model exposes auto as the default plus every catalog effort', () => {
  const catalog = addJevModel({ models: [{
    slug: 'gpt-6-astra',
    supported_reasoning_levels: [
      { effort: 'low' }, { effort: 'medium' }, { effort: 'high' },
      { effort: 'xhigh' }, { effort: 'max' }, { effort: 'ultra' },
    ],
  }] });
  const jev = catalog.models[0];
  assert.equal(jev.default_reasoning_level, CODEX_AUTO_EFFORT);
  assert.deepEqual(
    jev.supported_reasoning_levels.map(level => level.effort),
    ['auto', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  );
});

test('effort routing accepts every catalog level, including max and ultra', () => {
  const catalog = new Map([['gpt-6-astra', {
    slug: 'gpt-6-astra',
    supported_in_api: true,
    default_reasoning_level: 'medium',
    supported_reasoning_levels: [
      { effort: 'low' },
      { effort: 'medium' },
      { effort: 'high' },
      { effort: 'xhigh' },
      { effort: 'max' },
      { effort: 'ultra' },
    ],
  }]]);
  const [model] = codexModels(catalog);
  assert.deepEqual(model.efforts, ['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
  assert.equal(effortForModel(model, 'ultra', 'low'), 'ultra');
  assert.equal(effortForModel(model, 'unsupported', 'high'), 'high');
  assert.match(
    jevDecisionEvents({ tier: 'fable', model: model.id, effort: 'ultra', confidence: 0.9,
      effortMode: 'auto', effortConfidence: 0.8, reason: 'jev' }),
    /effort auto → ultra \(0\.80\)/,
  );
});

for (const lite of [true, false]) {
  test(`wire compatibility: Lite=${lite} filters choices and pinned continuations`, async () => {
    const sent = [];
    const catalog = [
      { slug: 'gpt-5.5', supported_in_api: true, use_responses_lite: false },
      { slug: 'gpt-6-sol', supported_in_api: true, use_responses_lite: true },
      { slug: 'gpt-unknown', supported_in_api: true },
    ];
    const upstream = http.createServer(async (req, res) => {
      if (req.url.startsWith('/models')) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ models: catalog }));
        return;
      }
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      sent.push({ model: body.model, lite: req.headers['x-openai-internal-codex-responses-lite'] });
      res.statusCode = req.headers['x-openai-internal-codex-responses-lite'] && body.model !== 'gpt-6-sol' ? 400 : 200;
      res.end('{}');
    });
    await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${upstream.address().port}`;
    const proxy = await startCodexProxy({ chatgptBaseURL: base, apiBaseURL: base, route: async ({ models }) => {
      assert.deepEqual(models.map(m => m.id), lite ? ['gpt-6-sol'] : catalog.map(m => m.slug));
      return { choice: 'gpt-5.5', confidence: 1 };
    } });
    try {
      for (const input of [
        [{ type: 'additional_tools' }, { role: 'user', content: 'hello' }],
        [{ type: 'function_call_output', output: 'ok' }],
      ]) {
        const response = await fetch(`http://127.0.0.1:${proxy.port}/responses`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(lite ? { 'X-OpenAI-Internal-Codex-Responses-Lite': 'true' } : {}) },
          body: JSON.stringify({ model: 'jev-router', prompt_cache_key: 'wire-test', input }),
        });
        await response.text();
        assert.equal(response.status, 200);
      }
      assert.deepEqual(sent, Array(2).fill({ model: lite ? 'gpt-6-sol' : 'gpt-5.5', lite: lite ? 'true' : undefined }));
    } finally {
      proxy.close();
      upstream.closeAllConnections();
      await new Promise(resolve => upstream.close(resolve));
    }
  });
}

test('an absent catalog never produces hardcoded model candidates', () => {
  assert.deepEqual(codexModels(), []);
});

test('selected effort is applied and pinned for tool continuations', async () => {
  const sent = [];
  const catalog = [{
    slug: 'gpt-6-sol',
    supported_in_api: true,
    use_responses_lite: true,
    default_reasoning_level: 'medium',
    supported_reasoning_levels: [
      { effort: 'low' }, { effort: 'medium' }, { effort: 'high' },
      { effort: 'xhigh' }, { effort: 'max' }, { effort: 'ultra' },
    ],
  }];
  const upstream = http.createServer(async (req, res) => {
    if (req.url.startsWith('/models')) return void res.end(JSON.stringify({ models: catalog }));
    let raw = '';
    for await (const chunk of req) raw += chunk;
    sent.push(JSON.parse(raw));
    res.end('{}');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${upstream.address().port}`;
  let routeCalls = 0;
  const proxy = await startCodexProxy({ chatgptBaseURL: base, apiBaseURL: base,
    route: async ({ efforts }) => {
      routeCalls++;
      assert.deepEqual(efforts, routeCalls === 1
        ? ['low', 'medium', 'high', 'xhigh', 'max', 'ultra']
        : []);
      return { choice: 'gpt-6-sol', confidence: 1, effort: 'ultra', effortConfidence: 0.9 };
    },
  });
  try {
    const post = (input, effort = 'auto', key = 'effort-test') => fetch(`http://127.0.0.1:${proxy.port}/responses`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'jev-router', prompt_cache_key: key,
        reasoning: { effort }, input }),
    });
    await (await post([{ type: 'additional_tools' }, { role: 'user', content: 'hard task' }])).text();
    await (await post([{ type: 'function_call_output', output: 'ok' }])).text();
    await (await post([{ type: 'additional_tools' }, { role: 'user', content: 'manual task' }],
      'high', 'manual-effort-test')).text();
    assert.deepEqual(sent.map(body => body.reasoning.effort), ['ultra', 'ultra', 'high']);
  } finally {
    proxy.close();
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
  }
});

for (const unavailable of [false, true]) {
  test(`cold start: catalog ${unavailable ? 'failure blocks forwarding' : 'controls routing and tool continuations'}`, async () => {
    const sent = [];
    const catalog = [{ slug: 'gpt-6-luna', supported_in_api: true }];
    const upstream = http.createServer(async (req, res) => {
      if (req.url.startsWith('/models')) {
        res.writeHead(unavailable ? 401 : 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ models: catalog }));
        return;
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      sent.push(JSON.parse(body));
      res.end('{}');
    });
    await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${upstream.address().port}`;
    let calls = 0;
    const proxy = await startCodexProxy({ chatgptBaseURL: base, apiBaseURL: base, route: async ({ models }) => {
      calls++;
      assert.deepEqual(models.map(m => m.id), ['gpt-6-luna']);
      // A stale/invalid Jev answer must not reintroduce an unavailable model.
      return { choice: 'gpt-nonexistent', confidence: 1 };
    } });
    try {
      const post = input => fetch(`http://127.0.0.1:${proxy.port}/responses`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'jev-router', prompt_cache_key: 'test', input }),
      });
      const response = await post([{ type: 'additional_tools' }, { role: 'user', content: 'hello' }]);
      await response.text();
      assert.equal(response.status, unavailable ? 503 : 200);
      if (unavailable) {
        assert.equal(sent.length, 0);
        assert.equal(calls, 0);
      } else {
        const continuation = await post([{ type: 'function_call_output', output: 'ok' }]);
        await continuation.text();
        assert.equal(continuation.status, 200);
        assert.deepEqual(sent.map(body => body.model), ['gpt-6-luna', 'gpt-6-luna']);
        assert.equal(calls, 1);
      }
    } finally {
      proxy.close();
      upstream.closeAllConnections();
      await new Promise(resolve => upstream.close(resolve));
    }
  });
}
