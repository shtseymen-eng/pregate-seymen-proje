#!/bin/zsh

script_dir="${0:A:h}"
cd "$script_dir" || exit 1

/usr/bin/env python3 generate.py
status=$?

echo
if [[ $status -eq 0 ]]; then
  echo "İşlem tamamlandı. Bu pencereyi kapatabilirsiniz."
else
  echo "İşlem tamamlanamadı. Yukarıdaki açıklamayı kontrol edin."
fi
read -r "?Kapatmak için Enter tuşuna basın..."
exit $status
