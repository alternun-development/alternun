const assert = require('node:assert/strict');
const test = require('node:test');

const { EvmChainAdapter } = require('../src/modules/wallet/chains/evm-adapter.ts');
const { BitcoinChainAdapter } = require('../src/modules/wallet/chains/bitcoin-adapter.ts');
const { SolanaChainAdapter } = require('../src/modules/wallet/chains/solana-adapter.ts');

// Mocked-fetch unit tests (deterministic, no live network calls in CI) — the adapters were also
// verified manually against the real public testnet/devnet RPCs during task 07's implementation
// (see .agents/active-tasks/alternun-wallet-system/07-multichain-rpc-integration.md), this suite
// locks in the request/response parsing logic going forward.

function jsonResponse(body, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

test('EvmChainAdapter.getBalance converts hex wei to a decimal string', async () => {
  const fetchFn = (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.method, 'eth_getBalance');
    return jsonResponse({ result: '0x16345785d8a0000' }); // 0.1 ETH in wei, hex
  };

  const adapter = new EvmChainAdapter('https://example.invalid', fetchFn);
  const balance = await adapter.getBalance('0x0000000000000000000000000000000000000000');
  assert.deepEqual(balance, { amount: '100000000000000000', unit: 'wei' });
});

test('EvmChainAdapter.getActivity returns empty (no indexer wired, documented gap)', async () => {
  const adapter = new EvmChainAdapter('https://example.invalid', () => {
    throw new Error('should not be called');
  });
  const activity = await adapter.getActivity('0x0');
  assert.deepEqual(activity, []);
});

test('EvmChainAdapter.broadcast forwards the raw signed tx and returns the hash', async () => {
  const fetchFn = (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.method, 'eth_sendRawTransaction');
    assert.deepEqual(body.params, ['0xdeadbeef']);
    return jsonResponse({ result: '0xabc123' });
  };
  const adapter = new EvmChainAdapter('https://example.invalid', fetchFn);
  const result = await adapter.broadcast('0xdeadbeef');
  assert.deepEqual(result, { txHash: '0xabc123' });
});

test('BitcoinChainAdapter.getBalance sums confirmed + mempool UTXOs', async () => {
  const fetchFn = () =>
    jsonResponse({
      chain_stats: { funded_txo_sum: 100000, spent_txo_sum: 40000 },
      mempool_stats: { funded_txo_sum: 5000, spent_txo_sum: 0 },
    });
  const adapter = new BitcoinChainAdapter('https://example.invalid', fetchFn);
  const balance = await adapter.getBalance('tb1qexample');
  assert.deepEqual(balance, { amount: '65000', unit: 'satoshi' });
});

test('BitcoinChainAdapter.getActivity infers direction and counterparty', async () => {
  const address = 'tb1qme';
  const fetchFn = () =>
    jsonResponse([
      {
        txid: 'tx1',
        status: { confirmed: true, block_time: 1700000000 },
        vin: [{ prevout: { scriptpubkey_address: address } }],
        vout: [{ scriptpubkey_address: 'tb1qother', value: 1000 }],
      },
      {
        txid: 'tx2',
        status: { confirmed: false },
        vin: [{ prevout: { scriptpubkey_address: 'tb1qother' } }],
        vout: [{ scriptpubkey_address: address, value: 2000 }],
      },
    ]);
  const adapter = new BitcoinChainAdapter('https://example.invalid', fetchFn);
  const activity = await adapter.getActivity(address);

  assert.equal(activity.length, 2);
  assert.equal(activity[0].direction, 'out');
  assert.equal(activity[0].counterparty, 'tb1qother');
  assert.equal(activity[0].confirmed, true);
  assert.equal(activity[1].direction, 'in');
  assert.equal(activity[1].confirmed, false);
});

test('BitcoinChainAdapter.broadcast posts the raw tx and trims the response', async () => {
  const fetchFn = (_url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.body, 'rawtxhex');
    return jsonResponse('  txid123\n', true);
  };
  const adapter = new BitcoinChainAdapter('https://example.invalid', fetchFn);
  const result = await adapter.broadcast('rawtxhex');
  assert.deepEqual(result, { txHash: 'txid123' });
});

test('SolanaChainAdapter.getBalance returns lamports', async () => {
  const fetchFn = () => jsonResponse({ result: { value: 42 } });
  const adapter = new SolanaChainAdapter('https://example.invalid', fetchFn);
  const balance = await adapter.getBalance('11111111111111111111111111111111');
  assert.deepEqual(balance, { amount: '42', unit: 'lamport' });
});

test('SolanaChainAdapter.getActivity infers direction from balance deltas', async () => {
  const address = 'AddrMe';
  const fetchFn = (_url, init) => {
    const body = JSON.parse(init.body);
    if (body.method === 'getSignaturesForAddress') {
      return jsonResponse({
        result: [{ signature: 'sig1', err: null, blockTime: 1700000000 }],
      });
    }
    if (body.method === 'getTransaction') {
      return jsonResponse({
        result: {
          transaction: { message: { accountKeys: [address, 'Other'] } },
          meta: { preBalances: [100, 50], postBalances: [80, 70] },
        },
      });
    }
    throw new Error(`unexpected method ${body.method}`);
  };
  const adapter = new SolanaChainAdapter('https://example.invalid', fetchFn);
  const activity = await adapter.getActivity(address);

  assert.equal(activity.length, 1);
  assert.equal(activity[0].direction, 'out');
  assert.equal(activity[0].amount, '20');
  assert.equal(activity[0].confirmed, true);
});

test('SolanaChainAdapter.broadcast sends the base64 transaction', async () => {
  const fetchFn = (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.method, 'sendTransaction');
    assert.equal(body.params[0], 'base64tx');
    return jsonResponse({ result: 'sigabc' });
  };
  const adapter = new SolanaChainAdapter('https://example.invalid', fetchFn);
  const result = await adapter.broadcast('base64tx');
  assert.deepEqual(result, { txHash: 'sigabc' });
});
