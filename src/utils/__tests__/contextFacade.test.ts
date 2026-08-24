import { makeContextFacade } from '../contextFacade';

interface Data {
  coins: number;
  wheel: { spins: number };
}
interface Actions {
  addCoins: (n: number) => void;
}

describe('makeContextFacade', () => {
  it('resolves actions from the stable bag and state from the live snapshot', () => {
    let state: Data = { coins: 5, wheel: { spins: 1 } };
    const calls: number[] = [];
    const actions: Actions = { addCoins: (n) => calls.push(n) };
    const facade = makeContextFacade<Data, Actions>(() => state, actions);

    expect(facade.coins).toBe(5);
    facade.addCoins(3);
    expect(calls).toEqual([3]);

    // A state write is visible through the SAME facade object — identity
    // never changes, values stay fresh.
    state = { coins: 9, wheel: { spins: 2 } };
    expect(facade.coins).toBe(9);
    expect({ ...facade.wheel }).toEqual({ spins: 2 });
  });

  it('actions shadow state keys and `in` sees both halves', () => {
    const facade = makeContextFacade(() => ({ a: 1 }), { b: () => 2 });
    expect('a' in facade).toBe(true);
    expect('b' in facade).toBe(true);
  });

  it('keeps one identity across state churn (the whole point)', () => {
    let state = { n: 0 };
    const facade = makeContextFacade(() => state, {});
    const before = facade;
    state = { n: 1 };
    expect(facade).toBe(before);
    expect(facade.n).toBe(1);
  });
});
