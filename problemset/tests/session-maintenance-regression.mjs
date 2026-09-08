import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('physics2.0.html', root), 'utf8');
const gas = await readFile(new URL('H2GAS.txt', root), 'utf8');
const deployedGas = await readFile(new URL('R8Physiics.gs', root), 'utf8');

assert.equal(gas, deployedGas, 'H2GAS.txtとR8Physiics.gsは同一内容である必要があります');
assert.match(html, /nextButton\.disabled = false[\s\S]*nextButton\.removeAttribute\('aria-disabled'\)/, '新しい演習でPROCEEDロックを解除する');
assert.match(html, /const loggingSessionId = currentSessionId[\s\S]*currentSessionId === loggingSessionId/, '保存後処理は開始時sessionIdに属する');
assert.match(html, /const finishedSessionId = currentSessionId[\s\S]*currentSessionId !== finishedSessionId/, '結果画面更新は終了sessionIdを確認する');
assert.match(html, /const saved = logResult && \(logResult\.status === 'success' \|\| logResult\.status === 'duplicate_skipped'\)/, '保存成功表示はGAS成功応答だけに限定する');
assert.match(html, /function advanceFromAnsweredQuestion[\s\S]*finishSession\(\)/, '最終問題は専用の遷移処理から結果画面へ進む');
assert.match(gas, /sameSession \|\| \(!sessionId && withinWindow && sameSet && sameScore && sameAcc\)/, 'sessionId送信時に時間窓重複判定を適用しない');
assert.match(gas, /setFormulas\(formulaRows\)/, '成績一覧の数式は一括設定する');
assert.match(gas, /const memberRowIndex = row;/, 'メンバー一覧の最終行を落とさない');
assert.match(gas, /setNumberFormat\('@'\)/, '識別列を文字列書式にする');

const advanceSource = html.match(/function advanceFromAnsweredQuestion[\s\S]*?\n        window\.recoverQuestionProgress/);
assert.ok(advanceSource, '問題遷移関数を取得できる');

const flow = {
  currentIdx: 0,
  quizData: [{ id: 'last' }],
  sessionAnswers: [true],
  isSessionFinalizing: false,
  isQuestionTransitioning: false,
  finishCalls: 0,
  showCalls: 0,
  window: { scrollTo() {} },
  document: { body: { scrollTop: 0 }, documentElement: { scrollTop: 0 } },
};
flow.showQuestion = () => { flow.showCalls += 1; };
flow.finishSession = () => { flow.finishCalls += 1; };
flow.window.recoverQuestionProgress = undefined;
vm.runInNewContext(advanceSource[0], flow);
vm.runInNewContext('advanceFromAnsweredQuestion()', flow);
assert.equal(flow.finishCalls, 1, '最終問題のPROCEEDは結果表示処理へ一度だけ進む');
assert.equal(flow.isQuestionTransitioning, false, '最終問題後に遷移ロックを残さない');
flow.currentIdx = 0;
flow.quizData = [{ id: 'first' }, { id: 'second' }];
flow.sessionAnswers = [true];
vm.runInNewContext('advanceFromAnsweredQuestion()', flow);
assert.equal(flow.currentIdx, 1, '途中問題のPROCEEDは次の問題へ進む');
assert.equal(flow.showCalls, 1, '途中問題のPROCEEDは次の問題を描画する');

console.log('session-maintenance-regression: PASS');
