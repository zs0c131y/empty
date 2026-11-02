"""
Lab 4: Character-level language model using a SimpleRNN (Keras).

Usage:
    python char_rnn.py [path/to/text.txt] [--epochs N] [--seed "text"]

Pipeline (matches the lab task list):
    1. Load text, build char<->index mappings
    2. Cut the text into 40-char input windows, target = the 41st char
    3. Vectorize into training tensors
    4. Build the RNN model
    5. Train
    6. Text generation function (temperature sampling)
    7. Generate new text and validate
"""
import argparse
import os
import sys

import numpy as np
from tensorflow import keras

SEQ_LEN = 40   # input window length
STEP = 1       # stride between windows (1 = every position)
MAX_BYTES = 50 * 1024


# ---------------------------------------------------------------- 1. load text
def load_text(path):
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        sys.exit(f"{path} is {size} bytes; the lab limits input to 50 KB.")
    with open(path, encoding="utf-8") as f:
        return f.read()


def build_vocab(text):
    chars = sorted(set(text))
    char_to_idx = {c: i for i, c in enumerate(chars)}
    idx_to_char = {i: c for c, i in char_to_idx.items()}
    return chars, char_to_idx, idx_to_char


# ------------------------------------------------- 2/3. training sequences
def make_sequences(text, char_to_idx, seq_len=SEQ_LEN, step=STEP):
    """Windows of seq_len chars -> the next (seq_len+1-th) char."""
    vocab = len(char_to_idx)
    inputs, targets = [], []
    for i in range(0, len(text) - seq_len, step):
        inputs.append(text[i:i + seq_len])
        targets.append(text[i + seq_len])

    # One-hot vectorization: x is (samples, seq_len, vocab), y is (samples, vocab)
    x = np.zeros((len(inputs), seq_len, vocab), dtype=np.float32)
    y = np.zeros((len(inputs), vocab), dtype=np.float32)
    for n, (window, nxt) in enumerate(zip(inputs, targets)):
        for t, ch in enumerate(window):
            x[n, t, char_to_idx[ch]] = 1.0
        y[n, char_to_idx[nxt]] = 1.0
    return x, y


# ------------------------------------------------------------- 4. build model
def build_model(seq_len, vocab):
    # Stacked RNN: the first layer returns the full sequence so the second can
    # consume it; the second returns only its final state.
    model = keras.Sequential([
        keras.layers.Input(shape=(seq_len, vocab)),
        keras.layers.SimpleRNN(256, return_sequences=True),
        keras.layers.SimpleRNN(256),
        keras.layers.Dense(vocab, activation="softmax"),
    ])
    model.compile(
        loss="categorical_crossentropy",
        optimizer=keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
        metrics=["accuracy"],
    )
    return model


# ------------------------------------------------------ 6. text generation
def sample(probs, temperature=1.0):
    """Draw an index from probs; low temperature = safer, high = more random."""
    probs = np.asarray(probs, dtype=np.float64)
    probs = np.log(probs + 1e-9) / temperature
    probs = np.exp(probs - probs.max())
    probs /= probs.sum()
    return int(np.random.choice(len(probs), p=probs))


def generate(model, seed, char_to_idx, idx_to_char, length=400,
             temperature=0.7, seq_len=SEQ_LEN):
    vocab = len(char_to_idx)
    # Pad/trim the seed to exactly seq_len characters (unknown chars dropped).
    seed = "".join(c for c in seed if c in char_to_idx)
    seed = seed.rjust(seq_len)[-seq_len:] if len(seed) >= seq_len else seed
    window = seed
    out = seed
    for _ in range(length):
        x = np.zeros((1, seq_len, vocab), dtype=np.float32)
        pad = seq_len - len(window)
        for t, ch in enumerate(window):
            x[0, pad + t, char_to_idx[ch]] = 1.0
        nxt = idx_to_char[sample(model.predict(x, verbose=0)[0], temperature)]
        out += nxt
        window = (window + nxt)[-seq_len:]
    return out


# ------------------------------------------------------------------- main
def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default=os.path.join(here, "sample.txt"))
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--seed", default=None, help="seed text (default: start of corpus)")
    args = ap.parse_args()

    text = load_text(args.path)
    chars, c2i, i2c = build_vocab(text)
    print(f"Corpus: {len(text)} chars, vocabulary: {len(chars)} unique chars")

    x, y = make_sequences(text, c2i)
    print(f"Training samples: {len(x)}  x{x.shape}  y{y.shape}")

    model = build_model(SEQ_LEN, len(chars))
    model.summary()
    model.fit(x, y, batch_size=64, epochs=args.epochs, verbose=2)

    # 7. Generate and validate: output should mimic the training style.
    seed = args.seed or text[:SEQ_LEN]
    for temp in (0.3, 0.7, 1.0):
        print(f"\n--- temperature {temp} ---")
        print(generate(model, seed, c2i, i2c, temperature=temp))

    sample_text = generate(model, seed, c2i, i2c, length=500, temperature=0.5)[len(seed):]
    vocab_words = set(text.lower().split())
    gen_words = sample_text.lower().split()
    hit = sum(w in vocab_words for w in gen_words) / max(len(gen_words), 1)
    print(f"\nValidation: {hit:.0%} of generated words appear in the training text")


if __name__ == "__main__":
    main()
