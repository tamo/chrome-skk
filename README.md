# chrome-skk
An SKK implementation for ChromeOS IME API.

Chrome OS 用 SKK IME

# Fork元
このレポジトリの元になっている https://github.com/hkurokawa/chrome-skk は https://github.com/jmuk/chrome-skk をフォークしたものです。
@hkurokawa さんのレポジトリ内容は @jmuk さんのご許可をいただいて、Chrome WebStore にて公開されています。

この my-full-featured という名前のブランチは、そこに個人的な好みで改造を加えたものです。

# インストール方法
1. git clone して Chrome OS 側と共有する (あるいは **Code** から **Download ZIP** して展開する)
1. `extension` ディレクトリに `https://raw.githubusercontent.com/nodeca/pako/refs/heads/master/dist/pako_deflate.es5.min.js` をダウンロード
1. Chrome で `chrome://extensions` を開き、 **Load Unpacked** をクリックして先程のフォルダ内の `extension` を指定する

# 設定方法
1. インストールされた拡張機能を右クリックして **options** をクリック
1. 辞書ファイルの URL を入力し、適宜圧縮形式や文字エンコードも選択する (例: `https://skk-dev.github.io/dict/SKK-JISYO.S.gz` あるいはダウンロードして同じフォルダ内に置けば `/SKK-JISYO.S.gz` と指定することも可能)
1. **reload** ボタンをクリック
1. IME をクリックして設定アイコンをクリック
1. **Add input methods** をクリックして、使っているキーボードレイアウトに合わせてSKKを選択する (例: `SKK(for Japanese keyboard)`)
1. IME を SKK に切り替える
1. Happy SKK!

