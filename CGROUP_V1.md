grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0"

stat -fc %T /sys/fs/cgroup/

tmpfsと表示された場合：cgroup v1が有効です。
cgroup2fsと表示された場合：cgroup v2が有効です。 

もとに戻す
どっちか
sudo grubby --update-kernel=ALL --remove-args="systemd.unified_cgroup_hierarchy=0"

sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
