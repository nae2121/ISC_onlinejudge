# Judge0 1.13.1 / isolate と cgroup v1

Judge0 worker のログに次のようなエラーが出る場合、ホストが cgroup v2 で起動していて
Judge0 1.13.1 の isolate が cgroup v1 の memory controller を見つけられていません。

```text
Failed to create control group /sys/fs/cgroup/memory/box-*/: No such file or directory
chown: cannot access '/box': No such file or directory
No such file or directory @ rb_sysopen - /box/main.cpp
```

現在の cgroup を確認します。

```sh
stat -fc %T /sys/fs/cgroup/
```

- `tmpfs`: cgroup v1 が有効
- `cgroup2fs`: cgroup v2 が有効。この状態では Judge0 1.13.1 が失敗することがあります。

## Kali / Debian / Ubuntu

`/etc/default/grub` の `GRUB_CMDLINE_LINUX_DEFAULT` に
`systemd.unified_cgroup_hierarchy=0` を追加します。

例:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=0"
```

反映して再起動します。

```sh
sudo update-grub
sudo reboot
```

再起動後に確認します。

```sh
stat -fc %T /sys/fs/cgroup/
docker compose down
docker compose up -d
```

## Fedora / RHEL 系

```sh
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0"
sudo reboot
```

## もとに戻す

Kali / Debian / Ubuntu:

```sh
sudo editor /etc/default/grub
sudo update-grub
sudo reboot
```

`GRUB_CMDLINE_LINUX_DEFAULT` から `systemd.unified_cgroup_hierarchy=0` を削除します。

Fedora / RHEL 系:

```sh
sudo grubby --update-kernel=ALL --remove-args="systemd.unified_cgroup_hierarchy=0"
sudo reboot
```

または cgroup v2 を明示します。

```sh
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
sudo reboot
```
